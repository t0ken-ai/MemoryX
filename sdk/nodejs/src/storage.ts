import * as path from "path";
import * as os from "os";
import * as fs from "fs";

let dbPromise: Promise<any> | null = null;
let storageDir: string | null = null;

export function setStorageDir(dir: string): void {
  storageDir = dir;
}

export function getStorageDir(): string {
  if (storageDir) return storageDir;
  return path.join(os.homedir(), ".memoryx", "sdk");
}

export async function getDb(): Promise<any> {
  if (dbPromise) return dbPromise;
  
  dbPromise = (async () => {
    const dir = getStorageDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const Database = (await import("better-sqlite3")).default;
    const dbPath = path.join(dir, "memoryx.db");
    const db = new Database(dbPath);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
      );
      
      CREATE TABLE IF NOT EXISTS memory_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        timestamp INTEGER NOT NULL,
        retry_count INTEGER DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS conversation_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT NOT NULL,
        conversation_created_at INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        retry_count INTEGER DEFAULT 0
      );
      
      CREATE INDEX IF NOT EXISTS idx_memory_queue_timestamp ON memory_queue(timestamp);
      CREATE INDEX IF NOT EXISTS idx_conversation_created ON conversation_queue(conversation_created_at);
      CREATE INDEX IF NOT EXISTS idx_conversation_id ON conversation_queue(conversation_id);
      
      CREATE TABLE IF NOT EXISTS dead_letter_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        queue_type TEXT NOT NULL,
        conversation_id TEXT,
        data TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at INTEGER NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_dlq_type ON dead_letter_queue(queue_type);
      CREATE INDEX IF NOT EXISTS idx_dlq_created ON dead_letter_queue(created_at);
    `);
    
    return db;
  })();
  
  return dbPromise;
}

export class SQLiteStorage {
  static async loadConfig(): Promise<Record<string, any> | null> {
    try {
      const db = await getDb();
      const row = db.prepare("SELECT value FROM config WHERE key = 'config'").get();
      if (row) {
        return JSON.parse(row.value);
      }
    } catch (e) {
      // ignore
    }
    return null;
  }
  
  static async saveConfig(config: Record<string, any>): Promise<void> {
    try {
      const db = await getDb();
      db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES ('config', ?)").run(JSON.stringify(config));
    } catch (e) {
      // ignore
    }
  }
  
  // Memory queue operations
  static async addToMemoryQueue(content: string, metadata: Record<string, any> = {}): Promise<number> {
    const db = await getDb();
    const result = db.prepare(`
      INSERT INTO memory_queue (content, metadata, timestamp)
      VALUES (?, ?, ?)
    `).run(content, JSON.stringify(metadata), Date.now());
    return result.lastInsertRowid as number;
  }
  
  static async getMemoryQueueItems(limit: number = 100): Promise<Array<{ id: number; content: string; metadata: string; timestamp: number; retry_count: number }>> {
    const db = await getDb();
    return db.prepare(`
      SELECT id, content, metadata, timestamp, retry_count
      FROM memory_queue
      ORDER BY id ASC
      LIMIT ?
    `).all(limit);
  }
  
  static async deleteMemoryItems(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDb();
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM memory_queue WHERE id IN (${placeholders})`).run(...ids);
  }
  
  static async incrementMemoryRetry(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDb();
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`UPDATE memory_queue SET retry_count = retry_count + 1 WHERE id IN (${placeholders})`).run(...ids);
  }
  
  static async deleteOldMemoryRetries(maxRetry: number = 5, maxAgeSeconds: number = 7 * 24 * 60 * 60): Promise<void> {
    const db = await getDb();
    const cutoffMs = Date.now() - maxAgeSeconds * 1000;
    db.prepare("DELETE FROM memory_queue WHERE retry_count >= ? OR timestamp < ?").run(maxRetry, cutoffMs);
  }
  
  static async getMemoryQueueLength(): Promise<number> {
    const db = await getDb();
    const row = db.prepare("SELECT COUNT(*) as count FROM memory_queue").get() as any;
    return row?.count || 0;
  }
  
  static async getMemoryQueueItemsExceedingRetry(maxRetry: number): Promise<Array<{ id: number; content: string; metadata: string; retry_count: number }>> {
    const db = await getDb();
    return db.prepare(`
      SELECT id, content, metadata, retry_count
      FROM memory_queue
      WHERE retry_count >= ?
    `).all(maxRetry);
  }
  
  static async moveMemoryToDeadLetterQueue(id: number, queueType: string = 'memory', errorMessage: string = ''): Promise<void> {
    const db = await getDb();
    
    // 获取 memory 数据
    const row = db.prepare("SELECT content, metadata, retry_count FROM memory_queue WHERE id = ?").get(id) as any;
    if (!row) return;
    
    // 插入死信队列
    db.prepare(`
      INSERT INTO dead_letter_queue (queue_type, conversation_id, data, retry_count, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(queueType, null, JSON.stringify({ content: row.content, metadata: row.metadata }), row.retry_count, errorMessage, Date.now());
  }
  
  // Conversation queue operations
  static async addToConversationQueue(conversationId: string, conversationCreatedAt: number, role: string, content: string): Promise<number> {
    const db = await getDb();
    const result = db.prepare(`
      INSERT INTO conversation_queue (conversation_id, conversation_created_at, role, content, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(conversationId, conversationCreatedAt, role, content, Date.now());
    return result.lastInsertRowid as number;
  }
  
  static async getConversationStats(conversationId: string): Promise<{ count: number; rounds: number }> {
    const db = await getDb();
    const rows = db.prepare(`
      SELECT role FROM conversation_queue 
      WHERE conversation_id = ? 
      ORDER BY id ASC
    `).all(conversationId) as any[];
    
    let rounds = 0;
    let i = 0;
    while (i < rows.length) {
      if (rows[i].role === 'user') {
        if (i + 1 < rows.length && rows[i + 1].role === 'assistant') {
          rounds++;
          i += 2;
        } else {
          i++;
        }
      } else {
        i++;
      }
    }
    
    return { count: rows.length, rounds };
  }
  
  static async getConversationMessages(conversationId: string): Promise<Array<{ id: number; role: string; content: string; timestamp: number; retry_count: number }>> {
    const db = await getDb();
    return db.prepare(`
      SELECT id, role, content, timestamp, retry_count
      FROM conversation_queue
      WHERE conversation_id = ?
      ORDER BY id ASC
    `).all(conversationId);
  }
  
  static async getNextConversation(): Promise<{ conversationId: string; conversationCreatedAt: number } | null> {
    const db = await getDb();
    const row = db.prepare(`
      SELECT conversation_id, MIN(conversation_created_at) as conversation_created_at
      FROM conversation_queue
      GROUP BY conversation_id
      ORDER BY MIN(conversation_created_at) ASC
      LIMIT 1
    `).get() as any;
    
    return row ? { conversationId: row.conversation_id, conversationCreatedAt: row.conversation_created_at } : null;
  }
  
  static async deleteConversation(conversationId: string): Promise<void> {
    const db = await getDb();
    db.prepare("DELETE FROM conversation_queue WHERE conversation_id = ?").run(conversationId);
  }
  
  static async incrementConversationRetry(conversationId: string): Promise<void> {
    const db = await getDb();
    db.prepare("UPDATE conversation_queue SET retry_count = retry_count + 1 WHERE conversation_id = ?").run(conversationId);
  }
  
  static async getConversationMaxRetry(conversationId: string): Promise<number> {
    const db = await getDb();
    const row = db.prepare("SELECT MAX(retry_count) as max_retry FROM conversation_queue WHERE conversation_id = ?").get(conversationId) as any;
    return row?.max_retry || 0;
  }
  
  static async clearOldConversations(maxAgeSeconds: number = 7 * 24 * 60 * 60): Promise<void> {
    const db = await getDb();
    const cutoff = Math.floor(Date.now() / 1000) - maxAgeSeconds;
    db.prepare("DELETE FROM conversation_queue WHERE conversation_created_at < ?").run(cutoff);
  }
  
  static async getConversationQueueLength(): Promise<number> {
    const db = await getDb();
    const row = db.prepare("SELECT COUNT(DISTINCT conversation_id) as count FROM conversation_queue").get() as any;
    return row?.count || 0;
  }
  
  static async getOldestMessageAge(conversationId: string): Promise<number> {
    const db = await getDb();
    const row = db.prepare("SELECT MIN(timestamp) as oldest FROM conversation_queue WHERE conversation_id = ?").get(conversationId) as any;
    if (!row?.oldest) return 0;
    return Date.now() - row.oldest;
  }
  
  // Dead Letter Queue operations
  static async moveToDeadLetterQueue(conversationId: string, queueType: string = 'conversation', errorMessage: string = ''): Promise<void> {
    const db = await getDb();
    
    // 获取会话的所有消息
    const messages = await this.getConversationMessages(conversationId);
    if (messages.length === 0) return;
    
    const maxRetry = await this.getConversationMaxRetry(conversationId);
    
    // 插入死信队列
    db.prepare(`
      INSERT INTO dead_letter_queue (queue_type, conversation_id, data, retry_count, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(queueType, conversationId, JSON.stringify(messages), maxRetry, errorMessage, Date.now());
  }
  
  static async getDeadLetterQueueItems(limit: number = 100): Promise<Array<{
    id: number;
    queue_type: string;
    conversation_id: string;
    data: string;
    retry_count: number;
    error_message: string;
    created_at: number;
  }>> {
    const db = await getDb();
    return db.prepare(`
      SELECT id, queue_type, conversation_id, data, retry_count, error_message, created_at
      FROM dead_letter_queue
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);
  }
  
  static async getDeadLetterQueueCount(): Promise<number> {
    const db = await getDb();
    const row = db.prepare("SELECT COUNT(*) as count FROM dead_letter_queue").get() as any;
    return row?.count || 0;
  }
  
  static async deleteDeadLetterItem(id: number): Promise<void> {
    const db = await getDb();
    db.prepare("DELETE FROM dead_letter_queue WHERE id = ?").run(id);
  }
  
  static async clearDeadLetterQueue(maxAgeSeconds: number = 30 * 24 * 60 * 60): Promise<void> {
    const db = await getDb();
    const cutoff = Date.now() - maxAgeSeconds * 1000;
    db.prepare("DELETE FROM dead_letter_queue WHERE created_at < ?").run(cutoff);
  }
}
