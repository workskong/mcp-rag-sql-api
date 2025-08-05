
# MCP RAG SQL API

**MCP RAG SQL API** is a server application that enables natural language search for SQL queries using advanced embedding models and in-memory vector search. It is designed to boost developer productivity by allowing users to find relevant SQL queries simply by describing their needs in plain language.

## 🚀 Features

- **Natural Language Query Search**: Input queries like "monthly sales report" or "user purchase history" and receive the most relevant SQL statements.
- **E5 Embedding Model**: Utilizes the Xenova E5 model via `@xenova/transformers` to convert natural language and SQL queries into high-dimensional vectors for accurate similarity search.
- **FAISS-like In-Memory Vector Search**: Employs the `vectordb` package for fast, scalable vector similarity search, storing embeddings and metadata in local files.
- **MCP Protocol Support**: Integrates Model-Context-Protocol (MCP) for flexible LLM interaction and real-time system monitoring.
- **RESTful HTTP API**: Simple endpoints for integration with other systems.
- **Inspector Tooling**: Real-time monitoring and control via MCP Inspector.

## �️ Technology Stack

- **Backend**: Node.js (ES Modules), Express.js
- **Embeddings**: `@xenova/transformers` (E5 model)
- **Vector Search**: `vectordb` (FAISS-like)
- **Protocol**: `@modelcontextprotocol/sdk`, `@modelcontextprotocol/inspector`
- **Environment Management**: `dotenv`
- **Security & Middleware**: `helmet`, `cors`
- **TypeScript**: Strict typing, ES2020 target

## 📁 Project Structure

```
.
├── src/
│   ├── index.ts
│   ├── data/query-data.ts
│   ├── embedding/e5-embedder.ts
│   ├── mcp/inspector.ts
│   ├── mcp/tools.ts
│   ├── rag/query-rag.ts
│   └── rag/vector-store.ts
├── data/
│   └── queries.json
├── .env
├── .env.example
├── .inspector.json
├── package.json
├── tsconfig.json
├── LICENSE
└── README.md
```

## ⚙️ Configuration

All configuration is managed via the `.env` file. See `.env.example` for defaults and copy it to `.env` to customize.

Key settings:
- `EMBEDDING_MODEL`: Model name (default: Xenova/e5-small-v2)
- `FAISS_INDEX_PATH`, `FAISS_METADATA_PATH`: Vector DB storage
- `QUERY_DATA_PATH`: Path to SQL query data
- `PORT`, `HOST`: Server settings
- `LOG_LEVEL`, `LOG_FILE`: Logging
- `INSPECTOR_ENABLED`, `INSPECTOR_PATH`: Inspector endpoint

## 🏁 Getting Started

### Prerequisites

- **Node.js**: v18 or higher
- **RAM**: 8GB+ recommended for embedding model
- **Disk**: 2GB+ recommended

### Installation

```bash
npm install
cp .env.example .env
# Edit .env as needed (model, port, etc.)
```

### Build & Run

#### Development

```bash
npm run dev
```

#### Production

```bash
npm run build
npm run start
```

### API Usage Example

Search for SQL queries using HTTP POST:

```bash
curl -X POST http://localhost:7979/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "monthly sales report", "topK": 3}'
```

## 🧩 MCP Inspector Usage

The MCP Inspector provides real-time monitoring and control of the server via the MCP protocol.

### Start MCP Server

```bash
npm run mcp-server
# or
node dist/index.js --mcpo
```

### Start Inspector

```bash
npm run inspector
# or
npx @modelcontextprotocol/inspector --config .inspector.json --server mcp-rag-sql-api
```

Inspector will connect to the running MCP server and expose tools for:
- Searching queries (`search_queries`)
- Adding new queries (`add_query`)
- Removing queries (`remove_query`)
- Viewing RAG system stats (`get_rag_stats`)

Configuration for Inspector is in `.inspector.json`.

## 🔒 Security

For production, set secrets in `.env`:
- `JWT_SECRET`
- `API_KEY`

## 📜 License

MIT License. See `LICENSE` for details.
