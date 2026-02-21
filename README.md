# MemoryX

AI-powered cognitive memory system with semantic search and graph-based entity relationships.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      MemoryX API                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  FastAPI    │  │   Celery    │  │   Memory Core       │ │
│  │  REST API   │  │   Queue     │  │   - Fact Extraction │ │
│  └─────────────┘  └─────────────┘  │   - Entity Relations│ │
│         │                │         │   - Classification  │ │
│         ▼                ▼         └─────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Storage Layer                          │   │
│  │  PostgreSQL │ Qdrant (Vector) │ Neo4j (Graph)       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Components

| Component | Purpose |
|-----------|---------|
| FastAPI | REST API server |
| Celery + Redis | Async task processing |
| PostgreSQL | User, API key, memory metadata |
| Qdrant | Vector similarity search |
| Neo4j | Entity relationship graph |
| Ollama/vLLM | LLM for fact extraction & embeddings |

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | User registration |
| POST | `/api/login` | User login |
| GET | `/api/me` | Get current user |

### API Keys
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/api_keys` | List API keys |
| POST | `/api/api_keys` | Create API key |
| DELETE | `/api/api_keys/{id}` | Delete API key |

### Memories
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/memories` | Create memory (async, returns task_id) |
| POST | `/api/v1/memories/batch` | Batch create memories |
| GET | `/api/v1/memories/task/{task_id}` | Get async task status |
| POST | `/api/v1/memories/search` | Semantic search |
| GET | `/api/v1/memories` | List memories |
| DELETE | `/api/v1/memories/{id}` | Delete memory |
| GET | `/api/v1/quota` | Get quota status |

### Conversations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/conversations/flush` | Flush conversation buffer |
| POST | `/api/v1/conversations/realtime` | Real-time message processing |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/{id}` | Get project |
| PUT | `/api/projects/{id}` | Update project |
| DELETE | `/api/projects/{id}` | Delete project |

### Agents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agents/auto-register` | Auto-register agent with fingerprint |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

## Environment Variables

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/memoryx
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key

LLM_BASE_URL=http://localhost:11434
EMBED_BASE_URL=http://localhost:11434
LLM_MODEL=qwen2.5-14b
EMBED_MODEL=bge-m3

QDRANT_HOST=localhost
QDRANT_PORT=6333

NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
```

## Deployment

### Docker Compose

```yaml
version: '3.8'
services:
  api:
    image: ghcr.io/t0ken-ai/memoryx-api:latest
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://memoryx:password@postgres:5432/memoryx
      - REDIS_URL=redis://redis:6379/0
      - QDRANT_HOST=qdrant
      - NEO4J_URI=bolt://neo4j:7687
    depends_on:
      - postgres
      - redis
      - qdrant
      - neo4j

  celery:
    image: ghcr.io/t0ken-ai/memoryx-api:latest
    command: python -m celery -A app.core.celery_config worker --loglevel=info --concurrency=2
    environment:
      - DATABASE_URL=postgresql://memoryx:password@postgres:5432/memoryx
      - REDIS_URL=redis://redis:6379/0
      - QDRANT_HOST=qdrant
      - NEO4J_URI=bolt://neo4j:7687
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: memoryx
      POSTGRES_PASSWORD: password
      POSTGRES_DB: memoryx
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

  neo4j:
    image: neo4j:5-community
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      NEO4J_AUTH: neo4j/password
    volumes:
      - neo4j_data:/data

volumes:
  postgres_data:
  redis_data:
  qdrant_data:
  neo4j_data:
```

## Development

```bash
cd api
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Start Celery worker:

```bash
celery -A app.core.celery_config worker --loglevel=info
```

## OpenClaw Plugin

MemoryX provides an official OpenClaw plugin for real-time memory capture and recall.

### Install

```bash
openclaw plugins install @t0ken.ai/memoryx-openclaw-plugin
openclaw gateway restart
```

### Update

```bash
openclaw plugins update @t0ken.ai/memoryx-openclaw-plugin
openclaw gateway restart
```

### Function Calling Tools

The plugin registers these tools for LLM:

| Tool | Description |
|------|-------------|
| `memoryx_recall` | Search memories by query |
| `memoryx_store` | Save information to memory |
| `memoryx_list` | List all stored memories |
| `memoryx_forget` | Delete a specific memory |

### Configuration

Edit `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "slots": {
      "memory": "memoryx-openclaw-plugin"
    },
    "entries": {
      "memoryx-openclaw-plugin": {
        "enabled": true,
        "config": {
          "apiBaseUrl": "https://t0ken.ai/api"
        }
      },
      "memory-core": {
        "enabled": false
      }
    }
  }
}
```

For self-hosted:

```json
{
  "apiBaseUrl": "http://192.168.31.65:8000/api"
}
```

## Project Structure

```
MemoryX/
├── api/
│   ├── app/
│   │   ├── routers/          # API endpoints
│   │   ├── services/
│   │   │   └── memory_core/  # Core memory logic
│   │   │       ├── graph_memory_service.py  # Main service
│   │   │       ├── classification.py        # LLM classification
│   │   │       ├── scoring.py               # Result ranking
│   │   │       └── temporal_kg.py           # Time-based queries
│   │   ├── core/             # Config, database, celery
│   │   └── models/           # SQLAlchemy models
│   └── requirements.txt
├── plugins/
│   └── memoryx-openclaw-plugin/  # OpenClaw integration
├── sdk/                       # Python SDK (t0ken-memoryx)
└── docs/                      # Documentation
```

## License

MIT
