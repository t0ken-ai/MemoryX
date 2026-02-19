#!/bin/bash
API_KEY="mx_m_26122e5ba946d26e_6a5ef3f934fc88e69152fa317742f0e9"

echo "=========================================="
echo "测试1: 重复添加相似记忆"
echo "=========================================="
echo ""

echo "--- 第一次添加 ---"
curl -s -X POST http://localhost:8000/api/v1/memories \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"content": "张三在华为工作，担任高级工程师"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"Added: {d['data']['stats']}\")"

echo ""
echo "--- 第二次添加（完全相同）---"
curl -s -X POST http://localhost:8000/api/v1/memories \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"content": "张三在华为工作，担任高级工程师"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"Added: {d['data']['stats']}\")"

echo ""
echo "--- 第三次添加（相似但不同表述）---"
curl -s -X POST http://localhost:8000/api/v1/memories \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"content": "张三是华为的高级工程师"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"Added: {d['data']['stats']}\")"

echo ""
echo "--- 第四次添加（更详细的信息）---"
curl -s -X POST http://localhost:8000/api/v1/memories \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"content": "张三在华为工作，担任高级工程师，负责AI算法研发"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"Added: {d['data']['stats']}\")"

echo ""
echo "=========================================="
echo "查看当前记忆状态"
echo "=========================================="
curl -s -X POST http://localhost:8000/api/v1/memories/search \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"query": "张三的工作", "limit": 10}' | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'找到 {len(d[\"data\"])} 条记忆:')
for m in d['data']:
    print(f'  - {m[\"memory\"]} (score: {m[\"score\"]:.3f})')
"
