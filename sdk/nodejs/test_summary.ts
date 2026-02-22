import { MemoryXSDK, setDebug } from './dist/index';

setDebug(true);

const API_URL = 'http://localhost:8001/api';

async function main() {
  console.log('=== 测试对话总结功能 ===\n');
  
  const sdk = new MemoryXSDK({
    apiUrl: API_URL,
    autoRegister: false,
    strategy: { rounds: 100 }  // 不自动触发
  });
  
  await sdk.init();
  
  // 模拟一个真实的对话流
  console.log('发送对话流...\n');
  
  await sdk.addMessage('user', '你好，我是张三，我在北京工作');
  await sdk.addMessage('assistant', '你好张三！很高兴认识你。北京是个很棒的城市，你在北京做什么工作呢？');
  await sdk.addMessage('user', '我是一名软件工程师，在阿里云工作，主要负责云存储相关的开发');
  await sdk.addMessage('assistant', '听起来很有趣！云存储是云计算的核心领域之一。你用的是什么技术栈？');
  await sdk.addMessage('user', '主要用 Go 和 Python，最近在学习 Rust');
  await sdk.addMessage('assistant', 'Rust 是一门很有前途的语言，内存安全且性能出色。学习曲线可能有点陡峭，但值得投入。');
  await sdk.addMessage('user', '是的，我觉得 Rust 的所有权概念很有意思。对了，我喜欢周末去打网球');
  await sdk.addMessage('assistant', '打网球是很好的运动！既能锻炼身体又能放松心情。你经常去哪里打球？');
  await sdk.addMessage('user', '通常在朝阳公园那边，那边场地不错');
  await sdk.addMessage('assistant', '朝阳公园环境很好，是个打球的好地方。希望你周末愉快！');
  
  // 手动触发 flush
  console.log('\n触发 flush...');
  await sdk.flush();
  
  console.log('\n等待服务端处理...');
  await new Promise(r => setTimeout(r, 10000));
  
  // 搜索验证
  console.log('\n=== 搜索验证 ===');
  const result = await sdk.search('张三', 5);
  console.log('搜索结果:', JSON.stringify(result, null, 2));
  
  sdk.destroy();
}

main().catch(console.error);
