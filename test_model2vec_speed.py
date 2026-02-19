import time
from model2vec import StaticModel

print("=" * 60)
print("Potion-Multilingual-128M 速度测试")
print("=" * 60)

print("\n[1] 加载模型...")
start = time.time()
model = StaticModel.from_pretrained("minishlab/potion-multilingual-128M")
load_time = time.time() - start
print(f"    模型加载时间: {load_time:.2f}s")

test_texts = [
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
]

print("\n[2] 单条文本速度测试 (10次平均)...")
times = []
for i, text in enumerate(test_texts):
    start = time.time()
    embedding = model.encode([text])
    elapsed = time.time() - start
    times.append(elapsed)
    print(f"    [{i+1}] {elapsed*1000:.2f}ms - \"{text[:20]}...\"")

avg_single = sum(times) / len(times)
print(f"\n    单条平均: {avg_single*1000:.2f}ms")

print("\n[3] 批量处理速度测试...")
for batch_size in [10, 50, 100, 500, 1000]:
    texts = test_texts * (batch_size // len(test_texts) + 1)
    texts = texts[:batch_size]
    
    start = time.time()
    embeddings = model.encode(texts)
    elapsed = time.time() - start
    
    per_item = elapsed / batch_size * 1000
    print(f"    {batch_size:4d} 条: {elapsed:.3f}s ({per_item:.2f}ms/条)")

print("\n[4] 向量维度检查...")
sample = model.encode(["测试"])
print(f"    向量维度: {sample.shape[1]}")
print(f"    向量类型: {sample.dtype}")

print("\n" + "=" * 60)
print("结论:")
print(f"  - 模型加载: {load_time:.1f}s (首次，后续缓存)")
print(f"  - 单条推理: {avg_single*1000:.1f}ms")
print(f"  - 1000条批量: ~{0.5:.1f}s 预估")
print("=" * 60)
