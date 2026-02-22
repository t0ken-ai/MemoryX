import { MemoryXSDK } from './dist/index';

// 使用错误的 API URL 来模拟服务端不可用
const WRONG_API_URL = 'http://localhost:9999/api';

async function main() {
  console.log('=== 测试发送失败情况 ===\n');
  
  // 使用已保存的 API key 但错误的 URL
  const sdk = new MemoryXSDK({
    apiUrl: WRONG_API_URL,
    autoRegister: false
  });
  
  await sdk.init();
  
  console.log('API Key:', sdk.getApiKey());
  console.log('API URL:', WRONG_API_URL);
  
  // 添加记忆
  console.log('\n=== 添加记忆 ===');
  const id1 = await sdk.addMemory('测试失败重试1：用户喜欢Python', { test: 'retry' });
  console.log('添加记忆 ID:', id1);
  
  const id2 = await sdk.addMemory('测试失败重试2：用户喜欢TypeScript', { test: 'retry' });
  console.log('添加记忆 ID:', id2);
  
  // 检查队列
  const queueLen = await sdk.getMemoryQueueLength();
  console.log('\n队列长度:', queueLen);
  
  // 尝试刷新 (应该失败)
  console.log('\n=== 尝试刷新 (应该失败) ===');
  try {
    await sdk.flush();
    console.log('刷新成功 (不应该)');
  } catch (e) {
    console.log('刷新失败 (预期):', (e as Error).message);
  }
  
  // 再次检查队列
  const queueLen2 = await sdk.getMemoryQueueLength();
  console.log('\n刷新后队列长度:', queueLen2);
  
  // 检查数据库
  console.log('\n=== 检查数据库 ===');
  const sqlite3 = require('better-sqlite3');
  const db = new sqlite3(require('path').join(require('os').homedir(), '.memoryx', 'sdk', 'memoryx.db'));
  const items = db.prepare('SELECT id, content, retry_count FROM memory_queue').all();
  console.log('数据库中的记忆:');
  for (const item of items) {
    console.log(`  ID: ${item.id}, retry_count: ${item.retry_count}, content: ${item.content.substring(0, 30)}...`);
  }
}

main().catch(console.error);
