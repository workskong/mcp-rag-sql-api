import { EventEmitter } from 'events';
export class McpInspector extends EventEmitter {
    constructor(server, options = {}) {
        super();
        this.server = server;
        this.options = {
            logLevel: options.logLevel || 'info',
            enablePerformanceMonitoring: options.enablePerformanceMonitoring || true,
            enableMessageLogging: options.enableMessageLogging || true,
            maxLogEntries: options.maxLogEntries || 1000,
            ...options
        };
        this.logs = [];
        this.metrics = {
            toolCalls: {
                total: 0,
                successful: 0,
                failed: 0,
                byTool: {}
            },
            performance: {
                averageResponseTime: 0,
                totalResponseTime: 0,
                minResponseTime: Infinity,
                maxResponseTime: 0
            },
            errors: {
                total: 0,
                byType: {}
            }
        };
        this.serverInfo = {
            startTime: new Date().toISOString(),
            version: '1.0.0',
            uptime: 0
        };
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        // 서버 연결/해제 이벤트 처리
        this.on('server:connect', (data) => {
            this.log('info', 'Server connected', data);
        });
        this.on('server:disconnect', (data) => {
            this.log('info', 'Server disconnected', data);
        });
    }
    /**
     * 로그 기록
     * @param {string} level - 로그 레벨
     * @param {string} message - 메시지
     * @param {object} data - 추가 데이터
     */
    log(level, message, data = {}) {
        if (!this.shouldLog(level)) {
            return;
        }
        const logEntry = {
            id: this.generateLogId(),
            timestamp: new Date().toISOString(),
            level,
            message,
            data,
            requestId: data.requestId || null
        };
        this.logs.push(logEntry);
        // 최대 로그 수 제한
        if (this.logs.length > this.options.maxLogEntries) {
            this.logs.shift();
        }
        // 콘솔 출력 (개발용)
        if (process.env.NODE_ENV === 'development') {
            const emoji = this.getLevelEmoji(level);
            console.log(`${emoji} [${level.toUpperCase()}] ${message}`, data);
        }
    }
    /**
     * 도구 호출 로깅
     * @param {string} requestId - 요청 ID
     * @param {string} toolName - 도구 이름
     * @param {object} args - 인수
     */
    logToolCall(requestId, toolName, args) {
        this.log('info', `Tool called: ${toolName}`, {
            requestId,
            toolName,
            args,
            type: 'tool-call'
        });
        // 메트릭 업데이트
        this.metrics.toolCalls.total++;
        if (!this.metrics.toolCalls.byTool[toolName]) {
            this.metrics.toolCalls.byTool[toolName] = {
                total: 0,
                successful: 0,
                failed: 0,
                averageTime: 0
            };
        }
        this.metrics.toolCalls.byTool[toolName].total++;
    }
    /**
     * 도구 결과 로깅
     * @param {string} requestId - 요청 ID
     * @param {string} toolName - 도구 이름
     * @param {object} result - 결과
     * @param {number} executionTime - 실행 시간 (ms)
     */
    logToolResult(requestId, toolName, result, executionTime) {
        this.log('info', `Tool completed: ${toolName}`, {
            requestId,
            toolName,
            executionTime,
            type: 'tool-result',
            resultSize: JSON.stringify(result).length
        });
        // 메트릭 업데이트
        this.metrics.toolCalls.successful++;
        this.metrics.toolCalls.byTool[toolName].successful++;
        this.updatePerformanceMetrics(executionTime);
        this.updateToolPerformanceMetrics(toolName, executionTime);
    }
    /**
     * 도구 에러 로깅
     * @param {string} requestId - 요청 ID
     * @param {string} toolName - 도구 이름
     * @param {Error} error - 에러
     * @param {number} executionTime - 실행 시간 (ms)
     */
    logToolError(requestId, toolName, error, executionTime) {
        this.log('error', `Tool failed: ${toolName}`, {
            requestId,
            toolName,
            error: error.message,
            stack: error.stack,
            executionTime,
            type: 'tool-error'
        });
        // 메트릭 업데이트
        this.metrics.toolCalls.failed++;
        this.metrics.toolCalls.byTool[toolName].failed++;
        this.metrics.errors.total++;
        const errorType = error.constructor.name;
        if (!this.metrics.errors.byType[errorType]) {
            this.metrics.errors.byType[errorType] = 0;
        }
        this.metrics.errors.byType[errorType]++;
    }
    /**
     * 성능 메트릭 업데이트
     * @param {number} executionTime - 실행 시간 (ms)
     */
    updatePerformanceMetrics(executionTime) {
        this.metrics.performance.totalResponseTime += executionTime;
        this.metrics.performance.averageResponseTime =
            this.metrics.performance.totalResponseTime / this.metrics.toolCalls.successful;
        if (executionTime < this.metrics.performance.minResponseTime) {
            this.metrics.performance.minResponseTime = executionTime;
        }
        if (executionTime > this.metrics.performance.maxResponseTime) {
            this.metrics.performance.maxResponseTime = executionTime;
        }
    }
    /**
     * 도구별 성능 메트릭 업데이트
     * @param {string} toolName - 도구 이름
     * @param {number} executionTime - 실행 시간 (ms)
     */
    updateToolPerformanceMetrics(toolName, executionTime) {
        const toolMetrics = this.metrics.toolCalls.byTool[toolName];
        const totalTime = toolMetrics.averageTime * (toolMetrics.successful - 1) + executionTime;
        toolMetrics.averageTime = totalTime / toolMetrics.successful;
    }
    /**
     * 로그 검색
     * @param {object} filters - 필터 조건
     * @returns {Array} 필터링된 로그
     */
    searchLogs(filters = {}) {
        let filteredLogs = [...this.logs];
        if (filters.level) {
            filteredLogs = filteredLogs.filter(log => log.level === filters.level);
        }
        if (filters.message) {
            filteredLogs = filteredLogs.filter(log => log.message.toLowerCase().includes(filters.message.toLowerCase()));
        }
        if (filters.requestId) {
            filteredLogs = filteredLogs.filter(log => log.requestId === filters.requestId);
        }
        if (filters.startTime) {
            filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startTime);
        }
        if (filters.endTime) {
            filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endTime);
        }
        // 제한된 수만 반환
        const limit = filters.limit || 100;
        return filteredLogs.slice(-limit);
    }
    /**
     * 메트릭 리포트 생성
     * @returns {object} 메트릭 리포트
     */
    generateMetricsReport() {
        const now = new Date();
        const startTime = new Date(this.serverInfo.startTime);
        this.serverInfo.uptime = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        return {
            timestamp: now.toISOString(),
            uptime: this.serverInfo.uptime,
            toolCalls: {
                ...this.metrics.toolCalls,
                successRate: this.metrics.toolCalls.total > 0
                    ? Math.round((this.metrics.toolCalls.successful / this.metrics.toolCalls.total) * 100)
                    : 0
            },
            performance: {
                ...this.metrics.performance,
                averageResponseTime: Math.round(this.metrics.performance.averageResponseTime * 100) / 100,
                minResponseTime: this.metrics.performance.minResponseTime === Infinity
                    ? 0
                    : this.metrics.performance.minResponseTime,
                maxResponseTime: this.metrics.performance.maxResponseTime
            },
            errors: this.metrics.errors,
            logStats: {
                totalLogs: this.logs.length,
                logLevels: this.getLogLevelStats()
            }
        };
    }
    /**
     * 서버 상태 조회
     * @returns {object} 서버 상태
     */
    getServerStatus() {
        return {
            status: 'running',
            startTime: this.serverInfo.startTime,
            uptime: Math.floor((new Date().getTime() - new Date(this.serverInfo.startTime).getTime()) / 1000),
            version: this.serverInfo.version,
            ragInitialized: this.server.queryRAG?.isInitialized || false,
            toolsAvailable: this.server.mcpTools?.getToolDefinitions().length || 0
        };
    }
    /**
     * 디버그 정보 덤프
     * @returns {object} 전체 디버그 정보
     */
    dumpDebugInfo() {
        return {
            serverStatus: this.getServerStatus(),
            metrics: this.generateMetricsReport(),
            recentLogs: this.searchLogs({ limit: 50 }),
            configuration: this.options
        };
    }
    /**
     * 로그 레벨별 통계
     * @returns {object} 레벨별 카운트
     */
    getLogLevelStats() {
        const stats = {};
        for (const log of this.logs) {
            const level = typeof log.level === 'string' ? log.level : String(log.level);
            stats[level] = (stats[level] || 0) + 1;
        }
        return stats;
    }
    /**
     * 로그 출력 여부 결정
     * @param {string} level - 로그 레벨
     * @returns {boolean} 출력 여부
     */
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(this.options.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex;
    }
    /**
     * 레벨별 이모지 반환
     * @param {string} level - 로그 레벨
     * @returns {string} 이모지
     */
    getLevelEmoji(level) {
        const emojis = {
            debug: '🐛',
            info: 'ℹ️',
            warn: '⚠️',
            error: '❌'
        };
        return emojis[level] || 'ℹ️';
    }
    /**
     * 로그 ID 생성
     * @returns {string} 로그 ID
     */
    generateLogId() {
        return `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }
    /**
     * 리소스 정리
     */
    cleanup() {
        this.logs = [];
        this.removeAllListeners();
        console.log('🧹 Inspector resources cleaned up');
    }
}
