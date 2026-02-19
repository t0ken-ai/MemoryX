#!/bin/bash
API_KEY="mx_m_26122e5ba946d26e_6a5ef3f934fc88e69152fa317742f0e9"

echo "=== 测试4: 更新记忆 (UPDATE) - 工作地点变更 ==="
echo "之前: 张三在北京工作"
echo "现在: 张三在上海工作"
echo ""
curl -s -X POST http://localhost:8000/api/v1/memories \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"content": "张三现在在上海腾讯工作，之前在北京阿里云"}'
