#!/bin/bash
API_KEY="mx_m_26122e5ba946d26e_6a5ef3f934fc88e69152fa317742f0e9"

echo "=== 测试6: 删除记忆 (DELETE) - 通过矛盾信息 ==="
echo "删除: 张三之前在北京工作"
echo ""
curl -s -X POST http://localhost:8000/api/v1/memories \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"content": "张三从来没有在北京工作过，那是错误的信息"}'
