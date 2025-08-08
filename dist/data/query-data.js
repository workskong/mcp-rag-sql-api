import { readFile, writeFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export class QueryData {
    constructor(options = {}) {
        this.queries = new Map();
        this.dataPath = join(__dirname, '../../data/queries.json');
        this.isLoaded = false;
        this.silent = options.silent || false;
    }
    /**
     * 쿼리 데이터 로드
     */
    async load() {
        try {
            if (!this.silent) {
                console.log('📂 Loading query data...');
            }
            // 파일 존재 확인
            try {
                await access(this.dataPath);
            }
            catch {
                // 파일이 없으면 샘플 데이터로 초기화
                await this.initializeSampleData();
                return;
            }
            // 기존 데이터 로드
            const content = await readFile(this.dataPath, 'utf-8');
            const data = JSON.parse(content);
            this.queries.clear();
            if (data.queries && Array.isArray(data.queries)) {
                for (const query of data.queries) {
                    this.queries.set(query.id, query);
                }
            }
            this.isLoaded = true;
            if (!this.silent) {
                console.log(`✅ Loaded ${this.queries.size} queries from data file`);
            }
        }
        catch (error) {
            console.error('❌ Failed to load query data:', error);
            // 로드 실패 시 샘플 데이터로 초기화
            await this.initializeSampleData();
        }
    }
    /**
     * 샘플 데이터로 초기화
     */
    async initializeSampleData() {
        if (!this.silent) {
            console.log('🔧 Initializing with sample query data...');
        }
        const sampleQueries = [];
        // 샘플 데이터를 내부 맵에 저장
        this.queries.clear();
        for (const query of sampleQueries) {
            this.queries.set(query.id, query);
        }
        // 파일에 저장
        await this.save();
        this.isLoaded = true;
        if (!this.silent) {
            console.log(`✅ Initialized with ${sampleQueries.length} sample queries`);
        }
    }
    /**
     * 쿼리 데이터 저장
     */
    async save() {
        try {
            const data = {
                version: '1.0',
                lastUpdated: new Date().toISOString(),
                queryCount: this.queries.size,
                queries: Array.from(this.queries.values())
            };
            await writeFile(this.dataPath, JSON.stringify(data, null, 2), 'utf-8');
            if (!this.silent) {
                console.log(`💾 Saved ${this.queries.size} queries to data file`);
            }
        }
        catch (error) {
            console.error('❌ Failed to save query data:', error);
            throw error;
        }
    }
    /**
     * 새 쿼리 추가
     * @param {object} queryInfo - 쿼리 정보
     * @returns {string} 생성된 쿼리 ID
     */
    async addQuery(queryInfo) {
        const { description, sqlScript, ApplicationSource = '', Module = '', metadata = {} } = queryInfo;
        if (!description || !sqlScript) {
            throw new Error('Description and SQL script are required');
        }
        const queryId = randomUUID();
        const query = {
            id: queryId,
            description: description.trim(),
            sqlScript: sqlScript.trim(),
            ApplicationSource,
            Module,
            metadata: {
                ...metadata,
                addedAt: new Date().toISOString()
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.queries.set(queryId, query);
        await this.save();
        return queryId;
    }
    /**
     * 쿼리 업데이트
     * @param {string} queryId - 쿼리 ID
     * @param {object} updates - 업데이트할 정보
     */
    async updateQuery(queryId, updates) {
        if (!this.queries.has(queryId)) {
            throw new Error(`Query not found: ${queryId}`);
        }
        const existingQuery = this.queries.get(queryId);
        if (!existingQuery)
            throw new Error(`Query not found: ${queryId}`);
        const updatedQuery = {
            id: queryId,
            description: updates.description ?? existingQuery.description,
            sqlScript: updates.sqlScript ?? existingQuery.sqlScript,
            metadata: updates.metadata ?? existingQuery.metadata,
            createdAt: existingQuery.createdAt,
            updatedAt: new Date().toISOString()
        };
        this.queries.set(queryId, updatedQuery);
        await this.save();
    }
    /**
     * 쿼리 삭제
     * @param {string} queryId - 쿼리 ID
     */
    async removeQuery(queryId) {
        if (!this.queries.has(queryId)) {
            throw new Error(`Query not found: ${queryId}`);
        }
        this.queries.delete(queryId);
        await this.save();
    }
    /**
     * ID로 쿼리 조회
     * @param {string} queryId - 쿼리 ID
     * @returns {object|null} 쿼리 정보
     */
    getQueryById(queryId) {
        return this.queries.get(queryId) || null;
    }
    /**
     * 모든 쿼리 반환
     * @returns {Array} 모든 쿼리 배열
     */
    getAllQueries() {
        return Array.from(this.queries.values());
    }
    /**
     * 카테고리별 쿼리 조회
     * @param {string} category - 카테고리명
     * @returns {Array} 해당 카테고리의 쿼리 배열
     */
    getQueriesByCategory(category) {
        return this.getAllQueries().filter(query => query.metadata?.category === category);
    }
    /**
     * 태그로 쿼리 검색
     * @param {string} tag - 태그명
     * @returns {Array} 해당 태그가 있는 쿼리 배열
     */
    getQueriesByTag(tag) {
        return this.getAllQueries().filter(query => query.metadata?.tags?.includes(tag));
    }
    /**
     * 텍스트 검색
     * @param {string} searchText - 검색 텍스트
     * @returns {Array} 매칭되는 쿼리 배열
     */
    searchQueries(searchText) {
        const searchLower = searchText.toLowerCase();
        return this.getAllQueries().filter(query => {
            return (query.description.toLowerCase().includes(searchLower) ||
                query.sqlScript.toLowerCase().includes(searchLower) ||
                query.metadata?.tags?.some(tag => tag.toLowerCase().includes(searchLower)));
        });
    }
    /**
     * 쿼리 수 반환
     * @returns {number} 총 쿼리 수
     */
    getQueryCount() {
        return this.queries.size;
    }
    /**
     * 통계 정보 반환
     * @returns {object} 통계 정보
     */
    getStats() {
        const queries = this.getAllQueries();
        const categories = {};
        const complexities = {};
        queries.forEach(query => {
            const category = query.metadata?.category || 'uncategorized';
            const complexity = query.metadata?.complexity || 'unknown';
            categories[category] = (categories[category] || 0) + 1;
            complexities[complexity] = (complexities[complexity] || 0) + 1;
        });
        return {
            totalQueries: this.queries.size,
            categories,
            complexities,
            isLoaded: this.isLoaded,
            dataPath: this.dataPath
        };
    }
    /**
     * 리소스 정리
     */
    async close() {
        if (this.queries.size > 0) {
            await this.save();
        }
        this.queries.clear();
        this.isLoaded = false;
        if (!this.silent) {
            console.log('🧹 QueryData resources cleaned up');
        }
    }
}
