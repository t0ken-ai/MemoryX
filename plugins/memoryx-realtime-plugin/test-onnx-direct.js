import { InferenceSession, Tensor } from 'onnxruntime-node';
import { env, AutoTokenizer } from '@huggingface/transformers';
import fs from 'fs';
import path from 'path';

const MODEL_DIR = './models/potion-multilingual-128M';

async function testONNXDirect() {
    console.log('='.repeat(60));
    console.log('ONNX Runtime Node + Potion-Multilingual-128M 完整测试');
    console.log('='.repeat(60));

    env.allowLocalModels = false;

    const testTexts = [
        "张三是一名Python工程师，住在北京朝阳区",
        "今天天气不错，适合出去玩",
        "机器学习是人工智能的一个分支",
        "I love programming in TypeScript",
        "日本の東京はとても綺麗な都市です",
        "프로그래밍은 재미있습니다",
        "La inteligencia artificial está cambiando el mundo",
        "这是一个关于用户偏好的记录，用户喜欢喝咖啡",
        "会议定于下周三下午三点在会议室A举行",
        "用户反馈产品体验良好，但希望增加暗色模式",
    ];

    console.log('\n[1] 加载 Tokenizer...');
    const tokenizer = await AutoTokenizer.from_pretrained('minishlab/potion-multilingual-128M');
    console.log('    ✓ Tokenizer 加载完成');

    console.log('\n[2] 加载 ONNX 模型...');
    const modelPath = path.join(MODEL_DIR, 'model.onnx');
    const loadStart = Date.now();
    
    const session = await InferenceSession.create(modelPath, {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'all'
    });
    
    const loadTime = (Date.now() - loadStart) / 1000;
    console.log(`    ✓ 模型加载: ${loadTime.toFixed(2)}s`);

    async function getEmbedding(text) {
        const encoded = await tokenizer(text, { return_tensors: 'pt', padding: true, truncation: true });
        const inputIds = Array.from(encoded.input_ids.data);
        const seqLen = inputIds.length;
        
        const feeds = {
            'input_ids': new Tensor('int64', BigInt64Array.from(inputIds.map(BigInt)), [seqLen]),
            'offsets': new Tensor('int64', BigInt64Array.from([0n, BigInt(seqLen)]), [2])
        };
        
        const results = await session.run(feeds);
        return Array.from(results['embeddings'].data).slice(0, 256);
    }

    console.log('\n[3] 单条文本推理测试 (10次)...');
    const singleTimes = [];
    
    for (let i = 0; i < testTexts.length; i++) {
        const text = testTexts[i];
        const start = Date.now();
        const embedding = await getEmbedding(text);
        const elapsed = Date.now() - start;
        singleTimes.push(elapsed);
        
        console.log(`    [${i + 1}] ${elapsed}ms (dim: ${embedding.length}) - "${text.substring(0, 15)}..."`);
    }

    const avgSingle = singleTimes.reduce((a, b) => a + b, 0) / singleTimes.length;
    console.log(`\n    单条平均: ${avgSingle.toFixed(1)}ms`);

    console.log('\n[4] 批量处理测试...');
    
    for (const batchSize of [10, 50, 100, 500, 1000]) {
        const texts = Array(Math.ceil(batchSize / testTexts.length)).fill(testTexts).flat().slice(0, batchSize);
        
        const start = Date.now();
        for (const text of texts) {
            await getEmbedding(text);
        }
        const elapsed = Date.now() - start;
        
        console.log(`    ${String(batchSize).padStart(4)} 条: ${(elapsed/1000).toFixed(2)}s (${elapsed}ms, ${(elapsed/batchSize).toFixed(1)}ms/条)`);
    }

    console.log('\n[5] 向量验证...');
    const sample = await getEmbedding("测试文本");
    console.log(`    向量维度: ${sample.length}`);
    console.log(`    前5个值: [${sample.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);

    console.log('\n' + '='.repeat(60));
    console.log('结论:');
    console.log(`  - 模型大小: 488MB`);
    console.log(`  - 模型加载: ${loadTime.toFixed(1)}s`);
    console.log(`  - 单条推理: ${avgSingle.toFixed(1)}ms`);
    console.log(`  - 1000条批量: ~${(avgSingle * 1000 / 1000).toFixed(1)}s 预估`);
    console.log(`  - 向量维度: 256`);
    console.log(`  - 语言支持: 101 种`);
    console.log('='.repeat(60));
}

testONNXDirect().catch(console.error);
