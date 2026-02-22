/**
 * MemoryX Node.js SDK 测试脚本
 */

import { MemoryXSDK, PRESET, countTokens, QueueStats } from './dist/index';

const API_URL = 'http://localhost:8001/api';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAutoRegister(): Promise<MemoryXSDK> {
  console.log('\n=== 测试自动注册 ===');
  
  const sdk = new MemoryXSDK({
    apiUrl: API_URL,
    autoRegister: true,
    agentType: 'nodejs_sdk_test'
  });
  
  await sdk.init();
  
  const apiKey = sdk.getApiKey();
  const projectId = sdk.getProjectId();
  const userId = sdk.getUserId();
  
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'null');
  console.log('Project ID:', projectId);
  console.log('User ID:', userId);
  
  if (!apiKey) {
    throw new Error('自动注册失败: 未获取到 API Key');
  }
  
  console.log('✓ 自动注册成功');
  return sdk;
}

async function testSingleMemory(sdk: MemoryXSDK): Promise<void> {
  console.log('\n=== 测试单条记忆模式 ===');
  
  const memories = [
    { content: '用户喜欢使用 Python 进行数据分析', metadata: { category: 'preference' } },
    { content: '用户工作于科技公司，职位是高级工程师', metadata: { category: 'work' } },
    { content: '用户偏好深色主题的编辑器', metadata: { category: 'preference' } },
    { content: '用户经常使用 VS Code 进行开发', metadata: { category: 'tool' } },
    { content: '用户对机器学习和人工智能感兴趣', metadata: { category: 'interest' } }
  ];
  
  for (const mem of memories) {
    const id = await sdk.addMemory(mem.content, mem.metadata);
    console.log(`添加记忆 [ID: ${id}]: ${mem.content.substring(0, 30)}...`);
  }
  
  const queueLength = await sdk.getMemoryQueueLength();
  console.log(`队列长度: ${queueLength}`);
  
  console.log('手动刷新队列...');
  await sdk.flush();
  
  console.log('等待后端处理...');
  await sleep(3000);
  
  console.log('✓ 单条记忆模式测试完成');
}

async function testConversation(sdk: MemoryXSDK): Promise<void> {
  console.log('\n=== 测试会话模式 ===');
  
  sdk.setStrategy({ rounds: 2 });
  
  const conversations = [
    { role: 'user' as const, content: '你好，我想了解一下你们的产品' },
    { role: 'assistant' as const, content: '你好！我是 MemoryX 的助手，很高兴为你介绍我们的产品。MemoryX 是一个智能记忆管理平台。' },
    { role: 'user' as const, content: '听起来不错，我主要用 Python 开发' },
    { role: 'assistant' as const, content: '太好了！MemoryX 完美支持 Python，我们有专门的 Python SDK。' }
  ];
  
  for (const msg of conversations) {
    const id = await sdk.addMessage(msg.role, msg.content);
    console.log(`添加消息 [${msg.role}]: ${msg.content.substring(0, 30)}...`);
  }
  
  const stats = await sdk.getQueueStats();
  console.log(`队列状态: 消息数=${stats.messageCount}, 轮数=${stats.rounds}`);
  
  console.log('手动刷新队列...');
  await sdk.flush();
  
  console.log('等待后端处理...');
  await sleep(3000);
  
  console.log('✓ 会话模式测试完成');
}

async function testSearch(sdk: MemoryXSDK): Promise<void> {
  console.log('\n=== 测试搜索功能 ===');
  
  const queries = ['Python', '开发工具', '用户偏好'];
  
  for (const query of queries) {
    console.log(`\n搜索: "${query}"`);
    const results = await sdk.search(query, 5);
    
    if (results.success) {
      console.log(`找到 ${results.data.length} 条记忆:`);
      for (const mem of results.data) {
        console.log(`  - [${mem.category}] ${mem.content.substring(0, 50)}... (score: ${mem.score.toFixed(3)})`);
      }
    } else {
      console.log('搜索失败');
    }
  }
  
  console.log('\n✓ 搜索功能测试完成');
}

async function testList(sdk: MemoryXSDK): Promise<void> {
  console.log('\n=== 测试列表功能 ===');
  
  const result = await sdk.list(10, 0);
  
  if (result.success) {
    console.log(`总共 ${result.total} 条记忆，显示前 ${result.data.length} 条:`);
    for (const mem of result.data) {
      console.log(`  - [${mem.id}] ${mem.content.substring(0, 50)}...`);
    }
  } else {
    console.log('列表获取失败');
  }
  
  console.log('\n✓ 列表功能测试完成');
}

async function testQuota(sdk: MemoryXSDK): Promise<void> {
  console.log('\n=== 测试配额功能 ===');
  
  const quota = await sdk.getQuota();
  console.log('配额信息:', JSON.stringify(quota, null, 2));
  
  console.log('\n✓ 配额功能测试完成');
}

async function testPresetModes(): Promise<void> {
  console.log('\n=== 测试预设模式 ===');
  
  const realtimeSdk = new MemoryXSDK({
    apiUrl: API_URL,
    preset: 'realtime'
  });
  console.log('realtime 模式策略:', JSON.stringify(PRESET.realtime));
  
  const batchSdk = new MemoryXSDK({
    apiUrl: API_URL,
    preset: 'batch'
  });
  console.log('batch 模式策略:', JSON.stringify(PRESET.batch));
  
  const convSdk = new MemoryXSDK({
    apiUrl: API_URL,
    preset: 'conversation'
  });
  console.log('conversation 模式策略:', JSON.stringify(PRESET.conversation));
  
  console.log('\n✓ 预设模式测试完成');
}

async function testTokenizer(): Promise<void> {
  console.log('\n=== 测试 Token 计数 ===');
  
  const texts = [
    'Hello, world!',
    '用户喜欢使用 Python 进行数据分析',
    'This is a longer text that should have more tokens in it.'
  ];
  
  for (const text of texts) {
    const tokens = countTokens(text);
    console.log(`"${text.substring(0, 30)}..." -> ${tokens} tokens`);
  }
  
  console.log('\n✓ Token 计数测试完成');
}

async function testCustomStrategy(): Promise<void> {
  console.log('\n=== 测试自定义策略 ===');
  
  const sdk = new MemoryXSDK({
    apiUrl: API_URL,
    strategy: {
      customTrigger: (stats: QueueStats) => {
        return stats.totalTokens >= 100 || stats.rounds >= 1;
      }
    }
  });
  
  await sdk.init();
  
  console.log('自定义策略: tokens >= 100 或 rounds >= 1');
  
  await sdk.addMessage('user', '测试自定义策略');
  await sdk.addMessage('assistant', '收到，这是一个测试消息');
  
  const stats = await sdk.getQueueStats();
  console.log(`队列状态: tokens=${stats.totalTokens}, rounds=${stats.rounds}`);
  
  await sdk.flush();
  
  console.log('\n✓ 自定义策略测试完成');
}

async function main(): Promise<void> {
  console.log('========================================');
  console.log('  MemoryX Node.js SDK 测试');
  console.log('========================================');
  
  try {
    const sdk = await testAutoRegister();
    
    await testSingleMemory(sdk);
    await testConversation(sdk);
    await testSearch(sdk);
    await testList(sdk);
    await testQuota(sdk);
    await testPresetModes();
    await testTokenizer();
    await testCustomStrategy();
    
    console.log('\n========================================');
    console.log('  所有测试通过! ✓');
    console.log('========================================');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  }
}

main();
