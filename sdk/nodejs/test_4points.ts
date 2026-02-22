import { MemoryXSDK, setDebug } from './dist/index';

setDebug(true);

const API_URL = 'http://localhost:8001/api';

async function main() {
  console.log('=== 测试4个关键点 ===\n');
  
  const sqlite3 = require('better-sqlite3');
  const path = require('path');
  const os = require('os');
  const dbPath = path.join(os.homedir(), '.memoryx', 'sdk', 'memoryx.db');
  const db = new sqlite3(dbPath);
  db.exec('DELETE FROM memory_queue; DELETE FROM conversation_queue');
  db.close();
  console.log('队列已清空\n');
  
  const sdk = new MemoryXSDK({
    apiUrl: API_URL,
    autoRegister: false,
    preset: 'conversation'
  });
  
  await sdk.init();
  
  // 测试1: 会话消息顺序
  console.log('=== 测试1: 会话消息顺序 ===');
  await sdk.addMessage('user', '第一条用户消息');
  await sdk.addMessage('assistant', '第一条助手回复');
  await sdk.addMessage('user', '第二条用户消息');
  await sdk.addMessage('assistant', '第二条助手回复');
  
  const db1 = new sqlite3(dbPath);
  const messages = db1.prepare('SELECT id, role, content FROM conversation_queue ORDER BY id ASC').all();
  console.log('消息顺序:');
  messages.forEach((m: any) => console.log(`  ${m.id}: [${m.role}] ${m.content}`));
  
  const roles = messages.map((m: any) => m.role);
  if (JSON.stringify(roles) === JSON.stringify(['user', 'assistant', 'user', 'assistant'])) {
    console.log('✓ 消息顺序正确\n');
  } else {
    console.log('✗ 消息顺序错误\n');
  }
  db1.close();
  
  // 测试2: 轮数计算
  console.log('=== 测试2: 轮数计算 ===');
  const stats = await sdk.getQueueStats();
  console.log(`消息数: ${stats.messageCount}, 轮数: ${stats.rounds}`);
  
  if (stats.rounds === 2) {
    console.log('✓ 轮数计算正确 (2轮)\n');
  } else {
    console.log(`✗ 轮数计算错误 (期望2, 实际${stats.rounds})\n`);
  }
  
  // 测试3: 重试逻辑
  console.log('=== 测试3: 重试逻辑 ===');
  const sdk2 = new MemoryXSDK({
    apiUrl: 'http://localhost:9999/api',  // 错误的URL
    autoRegister: false
  });
  await sdk2.init();
  
  // 清空并添加测试数据
  const db2 = new sqlite3(dbPath);
  db2.exec('DELETE FROM memory_queue');
  db2.close();
  
  await sdk2.addMemory('测试重试记忆');
  
  const queueLen1 = await sdk2.getMemoryQueueLength();
  console.log(`添加后队列长度: ${queueLen1}`);
  
  try {
    await sdk2.flush();
  } catch (e) {
    console.log(`刷新失败 (预期): ${(e as Error).message}`);
  }
  
  const queueLen2 = await sdk2.getMemoryQueueLength();
  const db3 = new sqlite3(dbPath);
  const retryItem = db3.prepare('SELECT retry_count FROM memory_queue').get() as any;
  db3.close();
  
  console.log(`刷新后队列长度: ${queueLen2}, retry_count: ${retryItem?.retry_count}`);
  
  if (queueLen2 === 1 && retryItem?.retry_count === 1) {
    console.log('✓ 重试逻辑正确 (队列保留, retry_count+1)\n');
  } else {
    console.log('✗ 重试逻辑错误\n');
  }
  
  sdk2.destroy();
  
  // 测试4: 日志输出
  console.log('=== 测试4: 日志输出 ===');
  console.log('查看上方日志输出，确认包含:');
  console.log('  - [MemoryX:INFO] 消息');
  console.log('  - [MemoryX:DEBUG] 消息 (debug模式)');
  console.log('  - [MemoryX:WARN] 消息 (失败时)');
  console.log('✓ 日志已启用\n');
  
  sdk.destroy();
  console.log('=== 测试完成 ===');
}

main().catch(console.error);
