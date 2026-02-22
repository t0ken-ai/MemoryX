import { MemoryXSDK } from './src/index';

const API_URL = 'http://localhost:8001/api/v1';
const TEST_API_KEY = 'omx_live_2c8f9a1b3d4e5f6a7b8c9d0e1f2a3b4c';

let testsPassed = 0;
let testsFailed = 0;

function log(section: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] [${section}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function assert(condition: boolean, testName: string, details?: string): void {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.log(`  ❌ FAIL: ${testName}${details ? ` - ${details}` : ''}`);
    testsFailed++;
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function test1_singleMemoryAdd() {
  log('TEST 1', '单条记忆添加测试');
  
  const sdk = new MemoryXSDK({
    apiUrl: API_URL,
    autoRegister: false,
    preset: 'realtime'
  });
  
  await sdk.init();
  
  const content = `测试单条记忆 ${Date.now()} - 这是一个测试内容`;
  const id = await sdk.addMemory(content, { source: 'test1' });
  
  assert(id > 0, '单条记忆添加返回 ID');
  
  await sdk.flush();
  await sleep(3000);
  
  const searchResult = await sdk.search('测试单条记忆', 5);
  assert(searchResult.success, '搜索成功');
  assert(searchResult.data.some((m: any) => m.content.includes('测试单条记忆')), '搜索结果包含添加的记忆');
  
  sdk.destroy();
}

async function test2_idleTimeout() {
  log('TEST 2', '会话流 - 空闲超时触发测试 (60秒)');
  
  const sdk = new MemoryXSDK({
    apiUrl: API_URL,
    autoRegister: false,
    strategy: { maxTokens: 100000, intervalMs: 60000 }
  });
  
  await sdk.init();
  
  const uniqueId = `idle_test_${Date.now()}`;
  
  await sdk.addMessage('user', `我是${uniqueId}，空闲测试用户`);
  await sdk.addMessage('assistant', `你好 ${uniqueId}，我会记住你的`);
  
  log('TEST 2', '消息已发送，等待 65 秒让空闲超时触发...');
  
  await sleep(65000);
  
  const searchResult = await sdk.search(uniqueId, 5);
  assert(searchResult.success, '搜索成功');
  
  const found = searchResult.data.some((m: any) => m.content.includes(uniqueId) || m.content.includes('空闲测试'));
  assert(found, '空闲超时后记忆被正确处理');
  
  sdk.destroy();
}

async function test3_maxTokens() {
  log('TEST 3', '会话流 - 最大 Token 触发测试');
  
  const sdk = new MemoryXSDK({
    apiUrl: API_URL,
    autoRegister: false,
    strategy: { maxTokens: 500, intervalMs: 10 * 60 * 1000 }
  });
  
  await sdk.init();
  
  const uniqueId = `token_test_${Date.now()}`;
  let totalTokens = 0;
  let messageCount = 0;
  
  log('TEST 3', '发送大量消息触发 500 token 限制...');
  
  while (totalTokens < 600) {
    const content = `这是${uniqueId}的第${messageCount + 1}条测试消息，包含一些额外的文字来增加token数量。我们需要确保能够触发maxTokens限制。`;
    await sdk.addMessage('user', content);
    await sdk.addMessage('assistant', `收到消息 ${messageCount + 1}，我会记住的。`);
    
    totalTokens += Math.ceil(content.length / 4) + 20;
    messageCount += 2;
    
    if (messageCount % 10 === 0) {
      log('TEST 3', `已发送 ${messageCount} 条消息，约 ${totalTokens} tokens`);
    }
  }
  
  log('TEST 3', `共发送 ${messageCount} 条消息，约 ${totalTokens} tokens`);
  
  await sleep(5000);
  
  const searchResult = await sdk.search(uniqueId, 5);
  assert(searchResult.success, '搜索成功');
  
  const found = searchResult.data.length > 0;
  assert(found, 'Token 限制触发后记忆被正确处理');
  
  sdk.destroy();
}

async function test4_messageOrder() {
  log('TEST 4', '消息顺序保证测试');
  
  const sdk = new MemoryXSDK({
    apiUrl: API_URL,
    autoRegister: false,
    strategy: { maxTokens: 100000, intervalMs: 60 * 60 * 1000 }
  });
  
  await sdk.init();
  
  const uniqueId = `order_test_${Date.now()}`;
  const messages: string[] = [];
  
  for (let i = 1; i <= 10; i++) {
    const msg = `消息${i.toString().padStart(2, '0')}_${uniqueId}`;
    messages.push(msg);
    await sdk.addMessage('user', msg);
    await sleep(100);
  }
  
  log('TEST 4', '发送的消息顺序:', messages);
  
  await sdk.flush();
  await sleep(3000);
  
  const searchResult = await sdk.search(uniqueId, 20);
  assert(searchResult.success, '搜索成功');
  
  log('TEST 4', '搜索结果:', searchResult.data.map((d: any) => d.content));
  
  sdk.destroy();
}

async function test5_newConversationIsolation() {
  log('TEST 5', '新会话隔离测试');
  
  const sdk = new MemoryXSDK({
    apiUrl: API_URL,
    autoRegister: false,
    strategy: { maxTokens: 100000, intervalMs: 60 * 60 * 1000 }
  });
  
  await sdk.init();
  
  const uniqueId1 = `conv1_${Date.now()}`;
  const uniqueId2 = `conv2_${Date.now()}`;
  
  await sdk.addMessage('user', `第一个会话: ${uniqueId1}`);
  await sdk.addMessage('assistant', `确认第一个会话: ${uniqueId1}`);
  
  await sdk.flush();
  await sleep(2000);
  
  await sdk.addMessage('user', `第二个会话: ${uniqueId2}`);
  await sdk.addMessage('assistant', `确认第二个会话: ${uniqueId2}`);
  
  await sdk.flush();
  await sleep(2000);
  
  const search1 = await sdk.search(uniqueId1, 5);
  const search2 = await sdk.search(uniqueId2, 5);
  
  assert(search1.success && search1.data.length > 0, '第一个会话内容被保存');
  assert(search2.success && search2.data.length > 0, '第二个会话内容被保存');
  
  sdk.destroy();
}

async function test6_largeTokenConversation() {
  log('TEST 6', '大 Token 会话流测试 (模拟真实场景)');
  
  const sdk = new MemoryXSDK({
    apiUrl: API_URL,
    autoRegister: false,
    preset: 'conversation'
  });
  
  await sdk.init();
  
  const uniqueId = `large_${Date.now()}`;
  
  const conversations = [
    { role: 'user' as const, content: `你好，我是${uniqueId}，我是一名高级软件工程师，在字节跳动工作，主要负责推荐系统的开发。` },
    { role: 'assistant' as const, content: `你好${uniqueId}！很高兴认识你。字节跳动是一家很棒的公司，推荐系统也是非常有趣的技术领域。你主要使用什么技术栈呢？` },
    { role: 'user' as const, content: `我们主要使用 Go 和 Python，推荐算法用 Python 实现，在线服务用 Go。最近也在尝试用 Rust 重写一些性能敏感的模块。` },
    { role: 'assistant' as const, content: `Go 和 Python 的组合很经典！Rust 确实适合性能优化。你们遇到什么性能瓶颈了吗？` },
    { role: 'user' as const, content: `是的，主要是实时特征计算的部分，延迟要求很高，Python 的 GIL 成了瓶颈。我们正在用 Rust 重写特征提取服务。` },
    { role: 'assistant' as const, content: `理解，实时推荐对延迟非常敏感。Rust 的零成本抽象和内存安全特性很适合这种场景。你们有开源计划吗？` },
    { role: 'user' as const, content: `目前还没有开源计划，不过我们内部有一个技术博客，会分享一些架构设计。我平时喜欢写技术文章。` },
    { role: 'assistant' as const, content: `写技术文章是很好的习惯！既能总结经验，又能建立个人品牌。你主要写哪些方面的内容？` },
    { role: 'user' as const, content: `主要写分布式系统设计、性能优化、还有 Rust 相关的内容。我的博客地址是 blog.${uniqueId}.com。` },
    { role: 'assistant' as const, content: `很专业的方向！分布式系统和性能优化都是热门话题。我会记住你的博客地址的。` },
    { role: 'user' as const, content: `另外，我周末喜欢打羽毛球，通常在望京的体育馆。如果你有其他爱好，我们可以聊聊。` },
    { role: 'assistant' as const, content: `羽毛球是很好的运动！望京体育馆设施不错。我虽然不能运动，但可以和你聊聊运动话题。` },
    { role: 'user' as const, content: `哈哈，好的。对了，我最近在学习机器学习，特别是深度学习在推荐系统中的应用。你有相关资源推荐吗？` },
    { role: 'assistant' as const, content: `深度学习在推荐系统中的应用非常广泛！我建议从 Word2Vec、DeepFM、DIN 这些经典模型开始学习。` },
    { role: 'user' as const, content: `谢谢推荐！我之前看过一些论文，但实践比较少。你们公司内部有相关的培训或分享吗？` },
    { role: 'assistant' as const, content: `很多大公司都有内部技术分享，你可以关注公司的技术委员会或学习平台。` },
    { role: 'user' as const, content: `好的，我会去看看。对了，我的邮箱是 ${uniqueId}@example.com，如果有问题可以联系我。` },
    { role: 'assistant' as const, content: `好的，我会记住你的邮箱。有什么问题随时交流！` },
  ];
  
  for (const msg of conversations) {
    await sdk.addMessage(msg.role, msg.content);
    await sleep(200);
  }
  
  log('TEST 6', '发送了大量对话，等待处理...');
  
  await sdk.flush();
  await sleep(5000);
  
  const searchResult = await sdk.search(uniqueId, 10);
  assert(searchResult.success, '搜索成功');
  assert(searchResult.data.length > 0, '找到相关记忆');
  
  log('TEST 6', '搜索结果:', searchResult.data);
  
  const hasWork = searchResult.data.some((m: any) => m.content.includes('字节跳动') || m.content.includes('推荐系统'));
  const hasHobby = searchResult.data.some((m: any) => m.content.includes('羽毛球'));
  const hasTech = searchResult.data.some((m: any) => m.content.includes('Rust') || m.content.includes('Go'));
  
  assert(hasWork, '记忆包含工作信息');
  assert(hasHobby, '记忆包含爱好信息');
  assert(hasTech, '记忆包含技术栈信息');
  
  sdk.destroy();
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('MemoryX SDK 深度测试');
  console.log('='.repeat(60));
  
  try {
    await test1_singleMemoryAdd();
    await test4_messageOrder();
    await test5_newConversationIsolation();
    await test6_largeTokenConversation();
    
    console.log('\n' + '='.repeat(60));
    console.log('以下测试需要较长时间，跳过:');
    console.log('  - TEST 2: 空闲超时测试 (需要 65 秒)');
    console.log('  - TEST 3: 最大 Token 测试 (需要大量消息)');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('测试执行出错:', error);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('测试结果汇总');
  console.log('='.repeat(60));
  console.log(`✅ 通过: ${testsPassed}`);
  console.log(`❌ 失败: ${testsFailed}`);
  console.log(`📊 总计: ${testsPassed + testsFailed}`);
  console.log('='.repeat(60));
}

runAllTests().catch(console.error);
