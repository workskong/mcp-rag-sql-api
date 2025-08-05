import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
export class McpTools {
    constructor(queryRAG, inspector = null) {
        this.queryRAG = queryRAG;
        this.inspector = inspector;
    }
    /**
     * Returns MCP tool definitions
     * @returns {Array} Array of tool definitions
     */
    getToolDefinitions() {
        return [
            {
                name: 'search_queries',
                description: 'Search SQL queries using natural language, find similar SQL scripts',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Natural language query to search (e.g., "View sales by customer", "Products with low stock", "Monthly sales performance")'
                        },
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
            },
            {
                name: 'add_query',
                description: 'Add a new SQL query to the RAG system',
                inputSchema: {
                    type: 'object',
                    properties: {
                        description: {
                            type: 'string',
                            description: 'Natural language description of the query'
                        },
                        sqlScript: {
                            type: 'string',
                            description: 'Actual SQL script'
                        },
                        metadata: {
                            type: 'object',
                            description: 'Additional metadata for the query',
                            properties: {
                                category: {
                                    type: 'string',
                                    description: 'Query category (e.g., analytics, sales, inventory)'
                                },
                                complexity: {
                                    type: 'string',
                                    enum: ['simple', 'medium', 'complex'],
                                    description: 'Query complexity'
                                },
                                tables: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'List of tables used'
                                },
                                tags: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Tags for search'
                                }
                            }
                        }
                    },
                    required: ['description', 'sqlScript']
                }
            },
            {
                name: 'get_rag_stats',
                description: 'View current status and statistics of the RAG system',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    additionalProperties: false
                }
            },
            {
                name: 'remove_query',
                description: 'Remove a specific query from the RAG system',
                inputSchema: {
                    type: 'object',
                    properties: {
                        queryId: {
                            type: 'string',
                            description: 'ID of the query to remove'
                        }
                    },
                    required: ['queryId']
                }
            }
        ];
    }
    /**
     * Execute MCP tool
     * @param {string} name - Tool name
     * @param {object} args - Tool arguments
     * @returns {Promise<object>} Execution result
     */
    async callTool(name, args) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            // Inspector logging
            if (this.inspector) {
                this.inspector.logToolCall(requestId, name, args);
            }
            let result;
            switch (name) {
                case 'search_queries':
                    result = await this.searchQueries(args);
                    break;
                case 'add_query':
                    result = await this.addQuery(args);
                    break;
                case 'get_rag_stats':
                    result = await this.getRagStats(args);
                    break;
                case 'remove_query':
                    result = await this.removeQuery(args);
                    break;
                default:
                    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
            }
            const executionTime = Date.now() - startTime;
            // Inspector success logging
            if (this.inspector) {
                this.inspector.logToolResult(requestId, name, result, executionTime);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
                    }
                ]
            };
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            // Inspector error logging
            if (this.inspector) {
                this.inspector.logToolError(requestId, name, error, executionTime);
            }
            console.error(`❌ Tool execution failed [${name}]:`, error);
            if (error instanceof Error) {
                throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error.message}`);
            }
            else {
                throw new McpError(ErrorCode.InternalError, 'Tool execution failed: Unknown error');
            }
        }
    }
    /**
     *  Query search
     */
    async searchQueries(args) {
        const { query, topK = 5 } = args;
        if (!query || typeof query !== 'string' || query.trim() === '') {
            throw new Error('Valid query string is required');
        }
        if (topK < 1 || topK > 20) {
            throw new Error('topK must be between 1 and 20');
        }
        const results = await this.queryRAG.searchSimilarQueries(query.trim(), topK);
        return {
            searchQuery: query,
            resultCount: results.length,
            results: results.map((result) => ({
                id: result.id,
                similarity: Math.round(result.similarity * 100) / 100,
                description: result.description,
                sqlScript: result.sqlScript,
                metadata: result.metadata
            }))
        };
    }
    /**
     * Add new query
     */
    async addQuery(args) {
        const { description, sqlScript, metadata = {} } = args;
        if (!description || typeof description !== 'string' || description.trim() === '') {
            throw new Error('Valid description is required');
        }
        if (!sqlScript || typeof sqlScript !== 'string' || sqlScript.trim() === '') {
            throw new Error('Valid SQL script is required');
        }
        const queryId = await this.queryRAG.addQuery({
            description: description.trim(),
            sqlScript: sqlScript.trim(),
            metadata: {
                ...metadata,
                addedVia: 'mcp-tool',
                addedAt: new Date().toISOString()
            }
        });
        return {
            success: true,
            queryId,
            message: 'Query successfully added to RAG system',
            description: description.trim()
        };
    }
    /**
     * Get RAG system statistics
     */
    async getRagStats(args) {
        const stats = this.queryRAG.getStats();
        return {
            systemStatus: 'operational',
            timestamp: new Date().toISOString(),
            ...stats,
            inspectorEnabled: !!this.inspector
        };
    }
    /**
     *  Remove query
     */
    async removeQuery(args) {
        const { queryId } = args;
        if (!queryId || typeof queryId !== 'string' || queryId.trim() === '') {
            throw new Error('Valid query ID is required');
        }
        await this.queryRAG.removeQuery(queryId.trim());
        return {
            success: true,
            queryId: queryId.trim(),
            message: 'Query successfully removed from RAG system'
        };
    }
    /**
     * Generate request ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
