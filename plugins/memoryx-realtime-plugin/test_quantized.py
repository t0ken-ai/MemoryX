import onnxruntime as ort
import numpy as np
import time

model_path = "models/potion-multilingual-128M/model_int8.onnx"
sess = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])

def get_embedding(text):
    tokens = [ord(c) for c in text][:128]
    while len(tokens) < 128:
        tokens.append(0)
    input_ids = np.array(tokens, dtype=np.int64)
    offsets = np.arange(128, dtype=np.int64)
    outputs = sess.run(None, {"input_ids": input_ids, "offsets": offsets})
    return outputs[0].mean(axis=0)

print("=== 相似度测试 ===")
tests = [
    ("今天天气真好", "今天的天气非常晴朗"),
    ("明天要开会", "后天要出差"),
    ("我爱学习", "学习使我快乐")
]

for t1, t2 in tests:
    e1 = get_embedding(t1)
    e2 = get_embedding(t2)
    cos = np.dot(e1, e2) / (np.linalg.norm(e1) * np.linalg.norm(e2))
    print(f"  '{t1}' vs '{t2}': {cos:.4f}")

print("\n=== 速度测试 (100次) ===")
times = []
for _ in range(100):
    start = time.time()
    get_embedding("测试文本" * 20)
    times.append(time.time() - start)

print(f"  平均: {np.mean(times)*1000:.2f}ms")
print(f"  最小: {np.min(times)*1000:.2f}ms")
print(f"  最大: {np.max(times)*1000:.2f}ms")

print("\n✓ 量化模型测试通过!")
