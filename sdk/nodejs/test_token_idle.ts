import { MemoryXSDK } from './src/index';

const API_URL = 'http://localhost:8001/api/v1';

function log(section: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] [${section}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testIdleTimeout() {
  console.log('\n' + '='.repeat(60));
  console.log('测试: 空闲超时触发 (30秒)');
  console.log('='.repeat(60));
  
  const sdk = new MemoryXSDK({
    apiUrl: API_URL,
    autoRegister: false,
    strategy: { maxTokens: 100000, intervalMs: 30000 }
  });
  
  await sdk.init();
  
  const uniqueId = `idle_${Date.now()}`;
  
  log('IDLE', '发送消息...');
  await sdk.addMessage('user', `我是${uniqueId}，这是空闲超时测试`);
  await sdk.addMessage('assistant', `你好 ${uniqueId}，我会记住你的`);
  
  const stats1 = await sdk.getQueueStats();
  log('IDLE', '发送后队列状态', stats1);
  
  log('IDLE', '等待 35 秒让空闲超时触发...');
  await sleep(35000);
  
  const stats2 = await sdk.getQueueStats();
  log('IDLE', '超时后队列状态', stats2);
  
  if (stats2.messageCount === 0) {
    console.log('✅ PASS: 空闲超时正确触发，队列已清空');
  } else {
    console.log('❌ FAIL: 空闲超时未触发，队列仍有消息');
  }
  
  sdk.destroy();
}

async function testMaxTokens() {
  console.log('\n' + '='.repeat(60));
  console.log('测试: 最大 Token 触发 (500 tokens)');
  console.log('='.repeat(60));
  
  const sdk = new MemoryXSDK({
    apiUrl: API_URL,
    autoRegister: false,
    strategy: { maxTokens: 500, intervalMs: 10 * 60 * 1000 }
  });
  
  await sdk.init();
  
  const uniqueId = `token_${Date.now()}`;
  let messageCount = 0;
  
  log('TOKEN', '发送消息直到触发 500 token 限制...');
  
  while (true) {
    const stats = await sdk.getQueueStats();
    
    if (stats.totalTokens >= 500) {
      log('TOKEN', `达到 token 限制`, { totalTokens: stats.totalTokens, messageCount: stats.messageCount });
      break;
    }
    
    const content = `这是${uniqueId}的第${messageCount + 1}条测试消息。我们需要发送足够多的消息来触发500token的限制。每条消息都包含一些额外的文字来增加token数量。`;
    await sdk.addMessage('user', content);
    await sdk.addMessage('assistant', `收到消息 ${messageCount + 1}`);
    
    messageCount += 2;
    
    if (messageCount % 4 === 0) {
      log('TOKEN', `进度: ${stats.totalTokens} tokens, ${stats.messageCount} messages`);
    }
    
    await sleep(100);
  }
  
  await sleep(1000);
  
  const stats2 = await sdk.getQueueStats();
  log('TOKEN', '最终队列状态', stats2);
  
  if (stats2.messageCount === 0) {
    console.log('✅ PASS: Token 限制触发后队列已清空');
  } else {
    console.log('❌ FAIL: Token 限制触发后队列未清空');
  }
  
  sdk.destroy();
}

async function testContinuousMessages() {
  console.log('\n' + '='.repeat(60));
  console.log('测试: 连续消息延长空闲时间');
  console.log('='.repeat(60));
  
  const sdk = new MemoryXSDK({
    apiUrl: API_URL,
    autoRegister: false,
    strategy: { maxTokens: 100000, intervalMs: 20000 }
  });
  
  await sdk.init();
  
  const uniqueId = `continuous_${Date.now()}`;
  
  log('CONT', '发送消息，然后每隔 10 秒发送一条，持续 60 秒...');
  
  await sdk.addMessage('user', `开始测试 ${uniqueId}`);
  
  for (let i = 0; i < 6; i++) {
    await sleep(10000);
    await sdk.addMessage('user', `消息 ${i + 1} - ${uniqueId}`);
    log('CONT', `发送消息 ${i + 1}`);
    
    const stats = await sdk.getQueueStats();
    log('CONT', `当前队列: ${stats.messageCount} messages, idle: ${Math.floor(stats.oldestMessageAge / 1000)}s`);
  }
  
  const stats1 = await sdk.getQueueStats();
  log('CONT', '停止发送，等待空闲超时...', { messageCount: stats1.messageCount });
  
  await sleep(25000);
  
  const stats2 = await sdk.getQueueStats();
  log('CONT', '超时后队列状态', stats2);
  
  if (stats2.messageCount === 0) {
    console.log('✅ PASS: 连续消息正确延长空闲时间，最终超时触发');
  } else {
    console.log('❌ FAIL: 空闲超时未正确触发');
  }
  
  sdk.destroy();
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('MemoryX SDK - Token 和空闲超时专项测试');
  console.log('='.repeat(60));
  
  try {
    await testMaxTokens();
    await testIdleTimeout();
    await testContinuousMessages();
  } catch (error) {
    console.error('测试执行出错:', error);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('测试完成');
  console.log('='.repeat(60));
}

runTests().catch(console.error);
