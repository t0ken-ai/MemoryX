#!/bin/bash
API_KEY="mx_m_26122e5ba946d26e_6a5ef3f934fc88e69152fa317742f0e9"

echo "=== 测试7: 搜索记忆 (SEARCH) ==="
echo "查询: 张三的工作情况"
echo ""
curl -s -X POST http://localhost:8000/api/v1/memories/search \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"query": "张三的工作情况", "limit": 5}'
