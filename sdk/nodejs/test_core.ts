import { MemoryXSDK } from './src/index';

const API_URL = 'http://localhost:8001/api/v1';

function log(section: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${section}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testTokenTrigger() {
  console.log('\n' + '='.repeat(60));
  console.log('测试 1: Token 限制触发 (500 tokens)');
  console.log('='.repeat(60));
  
  const sdk = new MemoryXSDK({
    apiUrl: API_URL,
    autoRegister: false,
    strategy: { maxTokens: 500, intervalMs: 60 * 60 * 1000 }
  });
  
  await sdk.init();
  
  const uniqueId = `token_${Date.now()}`;
  
  log('TEST', '发送消息直到达到 500 token...');
  
  let totalTokens = 0;
  let messageCount = 0;
  let prevConversationId = '';
  
  while (totalTokens < 600 && messageCount < 50) {
    const content = `这是${uniqueId}的第${messageCount + 1}条消息，需要足够多的文字来触发token限制。`;
    await sdk.addMessage('user', content);
    messageCount++;
    
    const stats = await sdk.getQueueStats();
    totalTokens = stats.totalTokens;
    
    if (!prevConversationId) {
      prevConversationId = stats.conversationId;
    }
    
    if (messageCount % 5 === 0) {
      log('TEST', `进度: ${totalTokens} tokens, ${messageCount} messages, conv: ${stats.conversationId}`);
    }
    
    await sleep(50);
  }
  
  await sleep(500);
  
  const finalStats = await sdk.getQueueStats();
  
  if (finalStats.conversationId !== prevConversationId) {
    console.log(`\n✅ PASS: Token 限制触发，创建了新会话 (${prevConversationId} -> ${finalStats.conversationId})`);
    sdk.destroy();
    return true;
  } else {
    console.log(`\n❌ FAIL: Token 限制未触发，会话 ID 未变化`);
    sdk.destroy();
    return false;
  }
}

async function testIdleTimeout() {
  console.log('\n' + '='.repeat(60));
  console.log('测试 2: 空闲超时触发 (20秒)');
  console.log('='.repeat(60));
  
  const sdk = new MemoryXSDK({
    apiUrl: API_URL,
    autoRegister: false,
    strategy: { maxTokens: 100000, intervalMs: 20000 }
  });
  
  await sdk.init();
  
  const uniqueId = `idle_${Date.now()}`;
  
  log('TEST', '发送消息...');
  await sdk.addMessage('user', `测试空闲超时 ${uniqueId}`);
  
  const stats1 = await sdk.getQueueStats();
  log('TEST', '发送后状态', { messageCount: stats1.messageCount, idleTime: Math.floor(stats1.oldestMessageAge / 1000) + 's' });
  
  log('TEST', '等待 25 秒让空闲超时触发...');
  await sleep(25000);
  
  const stats2 = await sdk.getQueueStats();
  log('TEST', '超时后状态', { messageCount: stats2.messageCount, idleTime: Math.floor(stats2.oldestMessageAge / 1000) + 's' });
  
  if (stats2.messageCount === 0) {
    console.log('\n✅ PASS: 空闲超时正确触发，队列已清空');
    sdk.destroy();
    return true;
  } else {
    console.log('\n❌ FAIL: 空闲超时未触发，队列仍有消息');
    sdk.destroy();
    return false;
  }
}

async function testContinuousMessages() {
  console.log('\n' + '='.repeat(60));
  console.log('测试 3: 连续消息延长空闲时间 (15秒超时)');
  console.log('='.repeat(60));
  
  const sdk = new MemoryXSDK({
    apiUrl: API_URL,
    autoRegister: false,
    strategy: { maxTokens: 100000, intervalMs: 15000 }
  });
  
  await sdk.init();
  
  const uniqueId = `cont_${Date.now()}`;
  
  log('TEST', '发送消息，然后每隔 5 秒发送一条，持续 30 秒...');
  await sdk.addMessage('user', `开始 ${uniqueId}`);
  
  for (let i = 0; i < 6; i++) {
    await sleep(5000);
    await sdk.addMessage('user', `消息 ${i + 1}`);
    
    const stats = await sdk.getQueueStats();
    log('TEST', `发送消息 ${i + 1}`, { 
      messageCount: stats.messageCount, 
      idleTime: Math.floor(stats.oldestMessageAge / 1000) + 's' 
    });
  }
  
  const stats1 = await sdk.getQueueStats();
  log('TEST', '停止发送，等待超时...', { messageCount: stats1.messageCount });
  
  await sleep(20000);
  
  const stats2 = await sdk.getQueueStats();
  log('TEST', '最终状态', { messageCount: stats2.messageCount });
  
  if (stats2.messageCount === 0) {
    console.log('\n✅ PASS: 连续消息延长空闲时间，最终超时触发');
    sdk.destroy();
    return true;
  } else {
    console.log('\n❌ FAIL: 空闲超时未正确触发');
    sdk.destroy();
    return false;
  }
}

async function testConversationIsolation() {
  console.log('\n' + '='.repeat(60));
  console.log('测试 4: 会话隔离');
  console.log('='.repeat(60));
  
  const sdk = new MemoryXSDK({
    apiUrl: API_URL,
    autoRegister: false,
    strategy: { maxTokens: 100000, intervalMs: 60 * 60 * 1000 }
  });
  
  await sdk.init();
  
  const conv1 = `conv1_${Date.now()}`;
  const conv2 = `conv2_${Date.now()}`;
  
  log('TEST', '发送第一个会话消息...');
  await sdk.addMessage('user', `第一个会话: ${conv1}`);
  
  const stats1 = await sdk.getQueueStats();
  const firstConvId = stats1.conversationId;
  log('TEST', '第一个会话状态', { conversationId: firstConvId, messageCount: stats1.messageCount });
  
  log('TEST', '手动开始新会话...');
  sdk.startNewConversation();
  
  const stats2 = await sdk.getQueueStats();
  log('TEST', '新会话状态', { conversationId: stats2.conversationId, messageCount: stats2.messageCount });
  
  log('TEST', '发送第二个会话消息...');
  await sdk.addMessage('user', `第二个会话: ${conv2}`);
  
  const stats3 = await sdk.getQueueStats();
  log('TEST', '第二个会话状态', { conversationId: stats3.conversationId, messageCount: stats3.messageCount });
  
  await sdk.flush();
  await sleep(1000);
  
  if (stats3.conversationId !== firstConvId) {
    console.log(`\n✅ PASS: 新会话 ID 正确生成 (${firstConvId} -> ${stats3.conversationId})`);
    sdk.destroy();
    return true;
  } else {
    console.log('\n❌ FAIL: 会话 ID 未正确更新');
    sdk.destroy();
    return false;
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('MemoryX SDK 核心功能测试');
  console.log('='.repeat(60));
  
  const results: { name: string; passed: boolean }[] = [];
  
  try {
    results.push({ name: 'Token 限制触发', passed: await testTokenTrigger() });
    results.push({ name: '空闲超时触发', passed: await testIdleTimeout() });
    results.push({ name: '连续消息延长空闲', passed: await testContinuousMessages() });
    results.push({ name: '会话隔离', passed: await testConversationIsolation() });
  } catch (error) {
    console.error('测试执行出错:', error);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('测试结果汇总');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  for (const r of results) {
    if (r.passed) {
      console.log(`✅ ${r.name}`);
      passed++;
    } else {
      console.log(`❌ ${r.name}`);
      failed++;
    }
  }
  
  console.log('-'.repeat(60));
  console.log(`通过: ${passed}/${results.length}`);
  console.log(`失败: ${failed}/${results.length}`);
  console.log('='.repeat(60));
}

runAllTests().catch(console.error);
