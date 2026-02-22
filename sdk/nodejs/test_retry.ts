import { MemoryXSDK } from './dist/index';

const API_URL = 'http://localhost:8001/api';

async function main() {
  console.log('=== 测试重试机制 ===\n');
  
  const sdk = new MemoryXSDK({
    apiUrl: API_URL,
    autoRegister: false,
    strategy: {
      intervalMs: 2000  // 2秒检查一次
    }
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
  await sdk.addMemory('测试重试1：用户喜欢Go', { test: 'retry' });
  await sdk.addMemory('测试重试2：用户喜欢Rust', { test: 'retry' });
  await sdk.addMemory('测试重试3：用户喜欢Zig', { test: 'retry' });
  
  const queueLen = await sdk.getMemoryQueueLength();
  console.log('队列长度:', queueLen);
  
  // 测试1: 停止 API 服务，手动刷新
  console.log('\n=== 测试1: 停止 API 服务后刷新 ===');
  console.log('请停止 API 服务 (Ctrl+C)');
  console.log('等待 5 秒...');
  await new Promise(r => setTimeout(r, 5000));
  
  try {
    await sdk.flush();
    console.log('刷新成功');
  } catch (e) {
    console.log('刷新失败 (预期):', (e as Error).message);
  }
  
  const queueLen2 = await sdk.getMemoryQueueLength();
  console.log('刷新后队列长度:', queueLen2);
  
  // 检查 retry_count
  const db2 = new sqlite3(dbPath);
  const items = db2.prepare('SELECT id, retry_count FROM memory_queue').all();
  console.log('retry_count:', items.map((i: any) => i.retry_count));
  db2.close();
  
  // 测试2: 重启 API 服务，再次刷新
  console.log('\n=== 测试2: 重启 API 服务后刷新 ===');
  console.log('请重启 API 服务');
  console.log('等待 5 秒...');
  await new Promise(r => setTimeout(r, 5000));
  
  try {
    await sdk.flush();
    console.log('刷新成功');
  } catch (e) {
    console.log('刷新失败:', (e as Error).message);
  }
  
  const queueLen3 = await sdk.getMemoryQueueLength();
  console.log('刷新后队列长度:', queueLen3);
  
  // 清理
  sdk.destroy();
}

main().catch(console.error);
