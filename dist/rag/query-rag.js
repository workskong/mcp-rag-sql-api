import { E5Embedder } from '../embedding/e5-embedder.js';
import { VectorStore } from './vector-store.js';
import { QueryData } from '../data/query-data.js';
export class QueryRAG {
    constructor(options = {}) {
        this.embedder = new E5Embedder({ silent: options.silent });
        this.vectorStore = new VectorStore({ silent: options.silent });
        this.queryData = new QueryData({ silent: options.silent });
        this.isInitialized = false;
        this.silent = options.silent || false;
    }
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            if (!this.silent) {
                console.log('🔧 Initializing Query RAG system...');
            }
            // 임베딩 모델 초기화
            await this.embedder.initialize();
            // 쿼리 데이터 로드
            await this.queryData.load();
            // 벡터 저장소 초기화
            await this.vectorStore.initialize(this.embedder.getDimension());
            // 기존 쿼리들을 벡터 저장소에 인덱싱
            await this.indexQueries();
            this.isInitialized = true;
            if (!this.silent) {
                if (!this.silent) {
                    console.log('✅ Query RAG system initialized successfully');
                }
            }
        }
        catch (error) {
            console.error('❌ Failed to initialize Query RAG:', error);
            throw error;
        }
    }
    /**
     * 모든 쿼리를 벡터 저장소에 인덱싱
     */
    async indexQueries() {
        try {
            const queries = this.queryData.getAllQueries();
            if (!this.silent) {
                console.log(`📊 Indexing ${queries.length} queries...`);
            }
            if (queries.length === 0) {
                if (!this.silent) {
                    console.log('⚠️ No queries to index');
                }
                return;
            }
            // 임베딩 배치 생성
            const descriptions = queries.map(q => q.description);
            const embeddings = await this.embedder.embedBatch(descriptions, 'passage: ');
            // 벡터 저장소에 추가
            await this.vectorStore.addVectors(embeddings, queries.map(q => q.id));
            if (!this.silent) {
                console.log(`✅ Successfully indexed ${queries.length} queries`);
            }
        }
        catch (error) {
            console.error('❌ Failed to index queries:', error);
            throw error;
        }
    }
    /**
     * 자연어 쿼리로 유사한 SQL 쿼리 검색
     * @param {string} naturalLanguageQuery - 자연어 쿼리
     * @param {number} topK - 반환할 결과 수
     * @returns {Promise<Array>} 유사한 쿼리 결과
     */
    async searchSimilarQueries(naturalLanguageQuery, topK = 3) {
        if (!this.isInitialized) {
            throw new Error('QueryRAG not initialized. Call initialize() first.');
        }
        if (!naturalLanguageQuery || typeof naturalLanguageQuery !== 'string') {
            throw new Error('Natural language query must be a non-empty string');
        }
        try {
            if (!this.silent) {
                console.log(`🔍 Searching for: "${naturalLanguageQuery}"`);
            }
            // 쿼리 임베딩 생성
            const queryEmbedding = await this.embedder.embedQuery(naturalLanguageQuery);
            // 벡터 검색
            const searchResults = await this.vectorStore.search(queryEmbedding, topK);
            // 결과를 쿼리 데이터와 매핑
            const results = searchResults.map(result => {
                const queryInfo = this.queryData.getQueryById(result.id);
                return {
                    id: result.id,
                    similarity: result.score,
                    description: queryInfo?.description ?? '',
                    sqlScript: queryInfo?.sqlScript ?? '',
                    ApplicationSource: queryInfo?.ApplicationSource ?? '',
                    Module: queryInfo?.Module ?? '',
                    metadata: queryInfo?.metadata ?? {}
                };
            });
            if (!this.silent) {
                console.log(`✅ Found ${results.length} similar queries`);
            }
            return results;
        }
        catch (error) {
            console.error('❌ Query search failed:', error);
            if (error instanceof Error) {
                throw new Error(`Failed to search queries: ${error.message}`);
            }
            else {
                throw new Error('Failed to search queries: Unknown error');
            }
        }
    }
    /**
     * 새로운 쿼리 추가
     * @param {object} queryInfo - 쿼리 정보
     * @returns {Promise<string>} 생성된 쿼리 ID
     */
    async addQuery(queryInfo) {
        const { description, sqlScript, metadata = {} } = queryInfo;
        if (!description || !sqlScript) {
            throw new Error('Description and SQL script are required');
        }
        try {
            if (!this.silent) {
                console.log('➕ Adding new query to RAG system...');
            }
            // 쿼리 데이터에 추가
            const queryId = await this.queryData.addQuery({
                description,
                sqlScript,
                metadata
            });
            // 임베딩 생성 및 벡터 저장소에 추가
            const embedding = await this.embedder.embedDocument(description);
            await this.vectorStore.addVectors([embedding], [queryId]);
            if (!this.silent) {
                console.log(`✅ Successfully added query with ID: ${queryId}`);
            }
            return queryId;
        }
        catch (error) {
            console.error('❌ Failed to add query:', error);
            if (error instanceof Error) {
                throw new Error(`Failed to add query: ${error.message}`);
            }
            else {
                throw new Error('Failed to add query: Unknown error');
            }
        }
    }
    /**
     * 쿼리 삭제
     * @param {string} queryId - 삭제할 쿼리 ID
     */
    async removeQuery(queryId) {
        try {
            if (!this.silent) {
                console.log(`🗑️ Removing query: ${queryId}`);
            }
            // 쿼리 데이터에서 삭제
            await this.queryData.removeQuery(queryId);
            // 벡터 저장소에서 삭제
            await this.vectorStore.removeVector(queryId);
            console.log(`✅ Successfully removed query: ${queryId}`);
        }
        catch (error) {
            console.error('❌ Failed to remove query:', error);
            if (error instanceof Error) {
                throw new Error(`Failed to remove query: ${error.message}`);
            }
            else {
                throw new Error('Failed to remove query: Unknown error');
            }
        }
    }
    /**
     * 쿼리 업데이트
     * @param {string} queryId - 업데이트할 쿼리 ID
     * @param {object} updates - 업데이트할 정보
     */
    async updateQuery(queryId, updates) {
        try {
            console.log(`📝 Updating query: ${queryId}`);
            // 쿼리 데이터 업데이트
            await this.queryData.updateQuery(queryId, updates);
            // 설명이 변경된 경우 임베딩 재생성
            if (updates.description) {
                const embedding = await this.embedder.embedDocument(updates.description);
                await this.vectorStore.updateVector(queryId, embedding);
            }
            console.log(`✅ Successfully updated query: ${queryId}`);
        }
        catch (error) {
            console.error('❌ Failed to update query:', error);
            if (error instanceof Error) {
                throw new Error(`Failed to update query: ${error.message}`);
            }
            else {
                throw new Error('Failed to update query: Unknown error');
            }
        }
    }
    /**
     * 통계 정보 반환
     * @returns {object} RAG 시스템 통계
     */
    getStats() {
        return {
            totalQueries: this.queryData.getQueryCount(),
            embeddingModel: this.embedder.getModelInfo(),
            vectorStoreInfo: this.vectorStore.getInfo(),
            isInitialized: this.isInitialized
        };
    }
    /**
     * 리소스 정리
     */
    async close() {
        console.log('🧹 Cleaning up Query RAG resources...');
        await this.embedder.cleanup();
        await this.vectorStore.cleanup();
        await this.queryData.close();
        this.isInitialized = false;
        console.log('✅ Query RAG cleanup complete');
    }
}
