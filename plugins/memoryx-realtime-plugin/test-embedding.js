import { pipeline, env } from '@huggingface/transformers';

async function testEmbeddingSpeed() {
    console.log('='.repeat(60));
    console.log('Transformers.js + BGE-Small-ZH 速度测试');
    console.log('='.repeat(60));

    env.allowLocalModels = false;

    const testTexts = [
        "张三是一名Python工程师，住在北京朝阳区",
        "今天天气不错，适合出去玩",
        "机器学习是人工智能的一个分支",
        "I love programming in TypeScript",
        "日本の東京はとても綺麗な都市です",
    ];

    console.log('\n[1] 加载 ONNX 模型...');
    console.log('    模型: Xenova/bge-small-zh-v1.5');
    console.log('    模型大小: ~100MB\n');

    const loadStart = Date.now();
    
    const extractor = await pipeline(
        'feature-extraction',
        'Xenova/bge-small-zh-v1.5',
        {
            progress_callback: (progress) => {
                if (progress.status === 'downloading') {
                    const pct = progress.progress ? progress.progress.toFixed(1) : '?';
                    process.stdout.write(`\r    下载进度: ${pct}%`);
                }
            }
        }
    );

    const loadTime = (Date.now() - loadStart) / 1000;
    console.log(`\n\n    模型加载完成: ${loadTime.toFixed(2)}s`);

    console.log('\n[2] 单条文本推理测试...');
    const times = [];
    let dim = 0;
    
    for (let i = 0; i < testTexts.length; i++) {
        const text = testTexts[i];
        const start = Date.now();
        
        const result = await extractor(text, { pooling: 'cls' });
        const embedding = Array.from(result.data);
        dim = embedding.length;
        
        const elapsed = Date.now() - start;
        times.push(elapsed);
        
        console.log(`    [${i + 1}] ${elapsed}ms - "${text.substring(0, 20)}..."`);
    }

    const avgSingle = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`\n    单条平均: ${avgSingle.toFixed(1)}ms`);

    console.log('\n[3] 批量处理测试...');
    
    for (const batchSize of [5, 10, 20]) {
        const repeatedBatch = Array(Math.ceil(batchSize / testTexts.length)).fill(testTexts).flat().slice(0, batchSize);
        
        const start = Date.now();
        const results = await extractor(repeatedBatch, { pooling: 'cls' });
        const elapsed = Date.now() - start;
        
        console.log(`    ${batchSize} 条: ${elapsed}ms (${(elapsed / batchSize).toFixed(1)}ms/条)`);
    }

    console.log('\n[4] 向量维度: ' + dim);

    console.log('\n' + '='.repeat(60));
    console.log('结论:');
    console.log(`  - 模型加载: ${loadTime.toFixed(1)}s (首次下载)`);
    console.log(`  - 单条推理: ${avgSingle.toFixed(1)}ms`);
    console.log(`  - 向量维度: ${dim}`);
    console.log('='.repeat(60));
}

testEmbeddingSpeed().catch(console.error);
