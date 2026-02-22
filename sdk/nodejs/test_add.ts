import { MemoryXSDK } from './dist/index';

const API_URL = 'http://localhost:8001/api';

async function main() {
  const sdk = new MemoryXSDK({
    apiUrl: API_URL,
    autoRegister: false
  });
  
  await sdk.init();
  
  console.log('API Key:', sdk.getApiKey());
  console.log('Project ID:', sdk.getProjectId());
  
  // 添加一条新记忆
  console.log('\n=== 添加新记忆 ===');
  const id = await sdk.addMemory('测试记忆：用户喜欢使用 TypeScript 开发前端应用', { category: 'test' });
  console.log('添加成功，ID:', id);
  
  // 检查队列
  const queueLen = await sdk.getMemoryQueueLength();
  console.log('队列长度:', queueLen);
  
  // 手动刷新
  console.log('\n=== 刷新队列 ===');
  await sdk.flush();
  
  // 再次检查队列
  const queueLen2 = await sdk.getMemoryQueueLength();
  console.log('刷新后队列长度:', queueLen2);
  
  // 等待后端处理
  console.log('\n等待 5 秒...');
  await new Promise(r => setTimeout(r, 5000));
  
  // 搜索
  console.log('\n=== 搜索测试 ===');
  const results = await sdk.search('TypeScript', 5);
  console.log('搜索结果:', JSON.stringify(results, null, 2));
}

main().catch(console.error);
