import { MemoryXSDK } from './dist/index';

const API_URL = 'http://localhost:8001/api';

async function main() {
  // 使用已保存的配置
  const sdk = new MemoryXSDK({
    apiUrl: API_URL,
    autoRegister: false  // 使用已保存的 API key
  });
  
  await sdk.init();
  
  console.log('API Key:', sdk.getApiKey());
  console.log('Project ID:', sdk.getProjectId());
  
  // 测试搜索
  console.log('\n=== 搜索测试 ===');
  const results = await sdk.search('Python', 10);
  console.log('搜索结果:', JSON.stringify(results, null, 2));
  
  // 测试列表
  console.log('\n=== 列表测试 ===');
  const list = await sdk.list(20, 0);
  console.log('列表结果:', JSON.stringify(list, null, 2));
}

main().catch(console.error);
