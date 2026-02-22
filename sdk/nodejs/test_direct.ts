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
  
  // 直接调用 API 测试
  console.log('\n=== 直接调用 API 测试 ===');
  const response = await fetch(`${API_URL}/v1/memories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': sdk.getApiKey()!
    },
    body: JSON.stringify({
      content: '直接API测试：用户喜欢使用 TypeScript 开发前端应用',
      project_id: sdk.getProjectId(),
      metadata: { category: 'test', source: 'direct_api' }
    })
  });
  
  const result = await response.json();
  console.log('API 响应:', JSON.stringify(result, null, 2));
  
  // 等待后端处理
  console.log('\n等待 10 秒...');
  await new Promise(r => setTimeout(r, 10000));
  
  // 搜索
  console.log('\n=== 搜索测试 ===');
  const results = await sdk.search('TypeScript', 5);
  console.log('搜索结果:', JSON.stringify(results, null, 2));
  
  // 列表
  console.log('\n=== 列表测试 ===');
  const list = await sdk.list(10, 0);
  console.log('列表结果:', JSON.stringify(list, null, 2));
}

main().catch(console.error);
