import { MemoryXSDK } from './dist/index';
import { SQLiteStorage } from './dist/storage';

const API_URL = 'http://localhost:8001/api';

async function main() {
  console.log('=== 测试 API 返回成功但后端未处理的情况 ===\n');
  
  console.log('请确保 Celery 已停止！');
  console.log('等待 3 秒...');
  await new Promise(r => setTimeout(r, 3000));
  
  const sdk = new MemoryXSDK({
    apiUrl: API_URL,
    autoRegister: false
  });
  
  await sdk.init();
  
  console.log('API Key:', sdk.getApiKey());
  
  // 清空队列
  const sqlite3 = require('better-sqlite3');
  const path = require('path');
  const os = require('os');
  const dbPath = path.join(os.homedir(), '.memoryx', 'sdk', 'memoryx.db');
  const db = new sqlite3(dbPath);
  db.exec('DELETE FROM memory_queue');
  db.close();
  console.log('队列已清空');
  
  // 添加记忆
  console.log('\n=== 添加记忆 ===');
  const id1 = await sdk.addMemory('测试Celery未启动：用户喜欢Rust', { test: 'no_celery' });
  console.log('添加记忆 ID:', id1);
  
  // 检查队列
  const queueLen = await sdk.getMemoryQueueLength();
  console.log('队列长度:', queueLen);
  
  // 刷新 (API 会返回成功，但 Celery 没处理)
  console.log('\n=== 刷新队列 ===');
  try {
    await sdk.flush();
    console.log('刷新成功');
  } catch (e) {
    console.log('刷新失败:', (e as Error).message);
  }
  
  // 检查队列
  const queueLen2 = await sdk.getMemoryQueueLength();
  console.log('刷新后队列长度:', queueLen2);
  
  // 检查数据库
  const db2 = new sqlite3(dbPath);
  const items = db2.prepare('SELECT id, content, retry_count FROM memory_queue').all();
  console.log('\n数据库中的记忆:');
  for (const item of items) {
    console.log(`  ID: ${item.id}, retry_count: ${item.retry_count}, content: ${item.content}`);
  }
  db2.close();
  
  console.log('\n=== 结论 ===');
  if (queueLen2 === 0) {
    console.log('问题：队列被清空，但后端实际未处理！');
    console.log('这说明：API 返回成功就删除队列，但 Celery 可能没处理');
  } else {
    console.log('正常：队列保留，等待重试');
  }
}

main().catch(console.error);
