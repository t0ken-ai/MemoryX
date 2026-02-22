import { MemoryXSDK, setDebug } from './dist/index';

setDebug(true);

async function testRounds() {
  console.log('=== 测试助手连续回复 ===\n');
  
  const sqlite3 = require('better-sqlite3');
  const path = require('path');
  const os = require('os');
  const dbPath = path.join(os.homedir(), '.memoryx', 'sdk', 'memoryx.db');
  const db = new sqlite3(dbPath);
  db.exec('DELETE FROM conversation_queue');
  db.close();
  
  const sdk = new MemoryXSDK({
    apiUrl: 'http://localhost:8001/api',
    autoRegister: false,
    strategy: { rounds: 10 }  // 设置大一点，不触发 flush
  });
  
  await sdk.init();
  
  // 场景1: 正常对话
  console.log('场景1: user → assistant → user → assistant');
  await sdk.addMessage('user', '问题1');
  await sdk.addMessage('assistant', '回答1');
  await sdk.addMessage('user', '问题2');
  await sdk.addMessage('assistant', '回答2');
  
  let stats = await sdk.getQueueStats();
  console.log(`轮数: ${stats.rounds} (期望: 2)\n`);
  
  // 场景2: 助手连续回复
  console.log('场景2: user → assistant → assistant → assistant');
  sdk.startNewConversation();
  const db2 = new sqlite3(dbPath);
  db2.exec('DELETE FROM conversation_queue');
  db2.close();
  
  await sdk.addMessage('user', '复杂问题');
  await sdk.addMessage('assistant', '回答第一部分');
  await sdk.addMessage('assistant', '回答第二部分');
  await sdk.addMessage('assistant', '回答第三部分');
  
  stats = await sdk.getQueueStats();
  console.log(`轮数: ${stats.rounds} (期望: 1，一个user对应多个assistant)\n`);
  
  // 场景3: 混合情况
  console.log('场景3: user → assistant → assistant → user → assistant');
  sdk.startNewConversation();
  const db3 = new sqlite3(dbPath);
  db3.exec('DELETE FROM conversation_queue');
  db3.close();
  
  await sdk.addMessage('user', '问题A');
  await sdk.addMessage('assistant', '回答A1');
  await sdk.addMessage('assistant', '回答A2');
  await sdk.addMessage('user', '问题B');
  await sdk.addMessage('assistant', '回答B');
  
  stats = await sdk.getQueueStats();
  console.log(`轮数: ${stats.rounds} (期望: 2)\n`);
  
  // 场景4: user连续
  console.log('场景4: user → user → assistant');
  sdk.startNewConversation();
  const db4 = new sqlite3(dbPath);
  db4.exec('DELETE FROM conversation_queue');
  db4.close();
  
  await sdk.addMessage('user', '问题1');
  await sdk.addMessage('user', '补充问题');
  await sdk.addMessage('assistant', '回答');
  
  stats = await sdk.getQueueStats();
  console.log(`轮数: ${stats.rounds} (期望: 1 或 2?)\n`);
  
  sdk.destroy();
}

testRounds().catch(console.error);
