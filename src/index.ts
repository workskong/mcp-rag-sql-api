
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { QueryRAG } from './rag/query-rag.js';
import { McpTools } from './mcp/tools.js';
import { McpInspector } from './mcp/inspector.js';
import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
// 환경 변수 로드
config();

const PORT: number = Number(process.env.PORT) || 7979;
const HOST = process.env.HOST || 'localhost';
const INSPECTOR_ENABLED = process.env.INSPECTOR_ENABLED === 'true';

// 단일 인스턴스 생성
let queryRAG: QueryRAG;
let inspector: McpInspector | null;
let mcpTools: McpTools;

try {
  queryRAG = new QueryRAG();
} catch (err) {
  console.error('[MCP INIT] QueryRAG 생성 오류:', err);
  process.exit(1);
}
try {
  inspector = INSPECTOR_ENABLED ? new McpInspector({}, { logLevel: process.env.LOG_LEVEL || 'info' }) : null;
} catch (err) {
  console.error('[MCP INIT] McpInspector 생성 오류:', err);
  process.exit(1);
}
try {
  mcpTools = new McpTools(queryRAG, inspector);
} catch (err) {
  console.error('[MCP INIT] McpTools 생성 오류:', err);
  process.exit(1);
}

async function initializeAll() {
  try {
    await queryRAG.initialize();
  } catch (err) {
    console.error('[MCP INIT] QueryRAG 초기화 오류:', err);
    process.exit(1);
  }
}

async function startMcpProtocolServer() {
  // Do not disable console.log; keep logs for debugging
  // Redirect console.error to stderr for MCPO compatibility
  const origConsoleError = console.error;
  console.error = (...args) => { process.stderr.write(args.join(' ') + '\n'); origConsoleError(...args); };

  const server = new Server(
    {
      name: 'mcp-rag-sql-api',
      version: '1.0.0',
      description: 'Query RAG MCP Server with E5 embeddings and FAISS-like vector search'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  try {
    console.error('🟢 Initializing standalone MCP server...');
    await initializeAll();
    console.error('🛠️ Setting up MCP tools...');

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        let tools = mcpTools.getToolDefinitions();
        if (!Array.isArray(tools) || tools.length === 0) {
          tools = [{
            name: 'echo',
            description: 'Echoes input text',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Text to echo' },
                topK: {
                  type: 'number',
                  description: 'Number of results to return (default: 1)',
                  default: 1,
                  minimum: 1,
                  maximum: 1
                }
              },
              required: ['query']
            }
          }];
        }
        return { tools };
      } catch (err: unknown) {
        return { tools: [] };
      }
    });
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        return await mcpTools.callTool(request.params.name, request.params.arguments);
      } catch (err: unknown) {
        let message = 'Tool execution error';
        if (err instanceof Error) {
          message = err.message;
        }
        return {
          error: {
            code: -32000,
            message
          }
        };
      }
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('🚀 MCP server running on STDIO');
    console.error('🔍 Use @modelcontextprotocol/inspector to connect');

    // Keep process alive for MCPO STDIO
    const keepAlive = () => {};
    const interval = setInterval(keepAlive, 1000);
    process.on('exit', () => { clearInterval(interval); });

    // Log process events for debugging
    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err);
    });
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection:', reason);
    });

    process.on('SIGINT', async () => {
      console.error('\n🛑 Shutting down MCP server...');
      await queryRAG.close();
      await server.close();
      process.exit(0);
    });
    process.on('SIGTERM', async () => {
      console.error('\n🛑 Shutting down MCP server...');
      await queryRAG.close();
      await server.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Failed to start MCP server:', error);
    process.exit(1);
  }
}

async function startHttpServer() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  try {
    await initializeAll();

    app.get('/health', (req: express.Request, res: express.Response) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString(), service: 'query-rag-mcp' });
    });

    app.post('/api/search', async (req: express.Request, res: express.Response) => {
      try {
        const { query, topK = 5 } = req.body;
        if (!query) {
          return res.status(400).json({ error: 'Query is required' });
        }
        const results = await queryRAG.searchSimilarQueries(query, topK);
        res.json({ results });
      } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.use('*', (req: express.Request, res: express.Response) => {
      res.status(404).json({ error: 'Not found' });
    });

    const server = app.listen(PORT, HOST, () => {
      console.log(`🚀 HTTP server running at http://${HOST}:${PORT}`);
    });

    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down HTTP server...');
      await queryRAG.close();
      server.close(() => process.exit(0));
    });
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down HTTP server...');
      await queryRAG.close();
      server.close(() => process.exit(0));
    });
  } catch (error) {
    console.error('❌ Failed to start HTTP server:', error);
    process.exit(1);
  }
}

const isMcpProtocol = process.env.MCPO_MODE === 'true' || process.argv.includes('--mcpo');

if (isMcpProtocol) {
  startMcpProtocolServer();
} else {
  startHttpServer();
}
