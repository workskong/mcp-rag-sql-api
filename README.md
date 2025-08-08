
 
# MCP RAG SQL API

**MCP RAG SQL API** is a server application for searching and managing SQL queries using natural language.  
It maximizes developer productivity by utilizing the E5 embedding model, in-memory vector search, and the MCP protocol.

## 🚀 Main Features

- Natural language-based SQL query search (`search_queries`)
- Add/Delete/View query statistics (`add_query`, `remove_query`, `get_rag_stats`)
- E5 embedding model and FAISS-like vector search
- MCP protocol and Inspector support
- RESTful HTTP API provided

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
├── .inspector.json
├── package.json
├── tsconfig.json
└── README.md
```

## ⚙️ Environment Settings

- All settings are managed with the `.env` file (model, port, paths, etc.)
- Main variables: `EMBEDDING_MODEL`, `QUERY_DATA_PATH`, `PORT`, `INSPECTOR_ENABLED`, etc.

## 🏁 Getting Started

### Requirements

- Node.js 18+
- 8GB+ RAM recommended

### Installation & Run

```bash
npm install
cp .env.example .env
# Edit the .env file
npm run build
npm run start
```

### Development/Production


- Development: `npm run dev`
- Production: `npm run build && npm run start`

## 🧩 MCP Inspector and Tools

- Real-time monitoring and control with MCP Inspector
- Example MCP tool list and input schema:

### search_queries

```json
{
  "query": "Natural language to search",
  "topK": 3
}
```

### add_query

```json
{
  "description": "Query description",
  "sqlScript": "Actual SQL",
  "ApplicationSource": "Source system",
  "Module": "Business module",
  "metadata": {
    "category": "Category",
    "tables": ["Table1", "Table2"],
    "tags": ["Tag1", "Tag2"]
  }
}
```

### remove_query

```json
{
  "queryId": "Query ID to delete"
}
```

### get_rag_stats

```json
{}
```

## 🔒 Security

- For production, set security variables such as `JWT_SECRET`, `API_KEY` in `.env`

## 📜 License

MIT License. See the LICENSE file for details.

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
