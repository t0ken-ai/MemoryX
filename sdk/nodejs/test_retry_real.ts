import { MemoryXSDK } from './dist/index';

const WRONG_API_URL = 'http://localhost:9999/api';
const CORRECT_API_URL = 'http://localhost:8001/api';

async function main() {
  console.log('=== 测试重试机制 ===\n');
  
  // 清空队列
  const sqlite3 = require('better-sqlite3');
  const path = require('path');
  const os = require('os');
  const dbPath = path.join(os.homedir(), '.memoryx', 'sdk', 'memoryx.db');
  const db = new sqlite3(dbPath);
  db.exec('DELETE FROM memory_queue');
  db.close();
  console.log('队列已清空');
  
  // 阶段1: 使用错误的 URL，添加记忆
  console.log('\n=== 阶段1: 使用错误的 URL ===');
  const sdk1 = new MemoryXSDK({
    apiUrl: WRONG_API_URL,
    autoRegister: false,
    strategy: { intervalMs: 1000 }
  });
  await sdk1.init();
  
  await sdk1.addMemory('测试重试1：用户喜欢Go', { test: 'retry' });
  await sdk1.addMemory('测试重试2：用户喜欢Rust', { test: 'retry' });
  await sdk1.addMemory('测试重试3：用户喜欢Zig', { test: 'retry' });
  
  const queueLen1 = await sdk1.getMemoryQueueLength();
  console.log('队列长度:', queueLen1);
  
  // 尝试刷新 (应该失败)
  console.log('\n尝试刷新 (错误的 URL)...');
  try {
    await sdk1.flush();
    console.log('刷新成功 (不应该)');
  } catch (e) {
    console.log('刷新失败 (预期):', (e as Error).message);
  }
  
  // 检查队列和 retry_count
  const db1 = new sqlite3(dbPath);
  const items1 = db1.prepare('SELECT id, retry_count, content FROM memory_queue').all();
  console.log('刷新后队列长度:', items1.length);
  console.log('retry_count:', items1.map((i: any) => `${i.retry_count}:${i.content.substring(0, 15)}`));
  db1.close();
  
  sdk1.destroy();
  
  // 阶段2: 使用正确的 URL，重新刷新
  console.log('\n=== 阶段2: 使用正确的 URL ===');
  const sdk2 = new MemoryXSDK({
    apiUrl: CORRECT_API_URL,
    autoRegister: false,
    strategy: { intervalMs: 1000 }
  });
  await sdk2.init();
  
  console.log('尝试刷新 (正确的 URL)...');
  try {
    await sdk2.flush();
    console.log('刷新成功');
  } catch (e) {
    console.log('刷新失败:', (e as Error).message);
  }
  
  // 检查队列
  const queueLen2 = await sdk2.getMemoryQueueLength();
  console.log('刷新后队列长度:', queueLen2);
  
  // 最终检查
  const db2 = new sqlite3(dbPath);
  const items2 = db2.prepare('SELECT id, retry_count, content FROM memory_queue').all();
  if (items2.length === 0) {
    console.log('\n✓ 所有记忆已成功发送');
  } else {
    console.log('\n剩余队列:');
    for (const item of items2) {
      console.log(`  ID: ${item.id}, retry_count: ${item.retry_count}, content: ${item.content}`);
    }
  }
  db2.close();
  
  sdk2.destroy();
}

main().catch(console.error);
