## 实施计划：GraphRAG 记忆按需加载优化

### 1. 数据库模型扩展
**文件**: `api/app/core/database.py`
- 新增 `KGEntity` 模型 - 知识图谱实体（持久化）
- 新增 `KGRelation` 模型 - 知识图谱关系
- 新增 `KGCommunity` 模型 - 社区摘要（轻量级索引）
- 新增 `MemoryEntityLink` 模型 - 记忆与实体的关联

### 2. 创建社区检测服务
**新文件**: `api/app/services/community_service.py`
- `Community` 数据类 - 社区模型
- `CommunityDetector` - Leiden 社区检测算法
- `CommunityStore` - 社区持久化存储
- 社区摘要生成（LLM）

### 3. 创建知识图谱存储服务
**新文件**: `api/app/services/kg_store.py`
- `KnowledgeGraphStore` - 图谱持久化（PostgreSQL）
- 实体/关系的 CRUD 操作
- 图遍历查询（BFS/DFS）
- 实体中心性计算

### 4. 创建 GraphRAG 检索服务
**新文件**: `api/app/services/graphrag_retriever.py`
- `GraphRAGRetriever` - 核心检索器
- 查询分析（实体抽取 + 意图识别）
- 社区匹配（轻量级）
- 图遍历扩展（多跳）
- 渐进式记忆加载
- `RetrievalResult` - 检索结果模型

### 5. 升级评分系统
**文件**: `api/app/services/scoring.py`
- 激活 `connection_strength` 字段
- 新增 `GraphEnhancedScorer` 类
- 图上下文加成计算
- 社区匹配分数

### 6. 集成到 MemoryService
**文件**: `api/app/services/memory_service.py`
- 创建记忆时同步更新知识图谱
- `search_memories()` 替换为 GraphRAG 检索
- 新增 `get_memories_by_ids()` 批量加载方法
- 记忆实体关联维护

### 7. 新增依赖
**文件**: `api/requirements.txt`
- `python-igraph` - 图算法库
- `leidenalg` - 社区检测
- `networkx` - 图结构处理

---

### 执行顺序
1. 扩展数据库模型 → 2. 知识图谱存储 → 3. 社区检测服务 → 4. GraphRAG 检索器 → 5. 评分系统升级 → 6. MemoryService 集成