// FAISS-like in-memory vector store implementation for cross-platform compatibility
export interface VectorMetadata {
    id: string;
    index: number;
    norm: number;
    [key: string]: any;
}

export interface VectorStoreOptions {
    silent?: boolean;
    indexType?: string;
}

export class VectorStore {
    public vectors: number[][];
    public metadata: VectorMetadata[];
    public normalizedVectors: number[][];
    public dimension: number | null;
    public isInitialized: boolean;
    public silent: boolean;
    public indexType: string;

    constructor(options: VectorStoreOptions = {}) {
        this.vectors = [];
        this.metadata = [];
        this.normalizedVectors = []; // 정규화된 벡터 저장
        this.dimension = null;
        this.isInitialized = false;
        this.silent = options.silent || false;
        this.indexType = options.indexType || 'flat'; // flat, ivf 지원 예정
    }

  async initialize(dimension: number): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.dimension = dimension;
      if (!this.silent) {
        console.log(`🔧 Initializing FAISS-like vector store with dimension: ${dimension}`);
        console.log(`📊 Index type: ${this.indexType}`);
      }
      
      this.isInitialized = true;
      if (!this.silent) {
        console.log('✅ Vector store initialized successfully');
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize vector store:', error);
      throw error;
    }
  }

  /**
   * 벡터들을 저장소에 추가
   * @param {number[][]} vectors - 추가할 벡터 배열
   * @param {string[]} queryIds - 벡터에 대응하는 쿼리 ID 배열
   */
  async addVectors(vectors: number[][], queryIds: string[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('VectorStore not initialized');
    }

    if (vectors.length !== queryIds.length) {
      throw new Error('Vector count must match query ID count');
    }

    try {
      for (let i = 0; i < vectors.length; i++) {
        if (vectors[i].length !== this.dimension) {
          throw new Error(`Vector ${i} has wrong dimension: expected ${this.dimension}, got ${vectors[i].length}`);
        }
        
        // 원본 벡터 저장
        this.vectors.push(vectors[i]);
        
        // 정규화된 벡터 저장 (코사인 유사도 최적화)
        const normalizedVector = this.normalizeVector(vectors[i]);
        this.normalizedVectors.push(normalizedVector);
        
        this.metadata.push({
          id: queryIds[i],
          index: this.vectors.length - 1,
          norm: this.vectorNorm(vectors[i])
        });
      }
      
      if (!this.silent) {
        console.log(`✅ Added ${vectors.length} vectors to FAISS-like store`);
      }
      
    } catch (error) {
      console.error('❌ Failed to add vectors:', error);
      throw error;
    }
  }

  /**
   * 벡터 정규화
   * @param {number[]} vector - 원본 벡터
   * @returns {number[]} 정규화된 벡터
   */
  normalizeVector(vector: number[]): number[] {
    const norm = this.vectorNorm(vector);
    if (norm === 0) return vector.slice(); // 영벡터는 그대로 반환
    
    return vector.map(val => val / norm);
  }

  /**
   * 벡터 노름 계산
   * @param {number[]} vector - 벡터
   * @returns {number} L2 노름
   */
  vectorNorm(vector: number[]): number {
    return Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  }

  /**
   * 최적화된 코사인 유사도 계산 (정규화된 벡터 사용)
   * @param {number[]} normalizedA - 정규화된 벡터 A
   * @param {number[]} normalizedB - 정규화된 벡터 B
   * @returns {number} 유사도 점수
   */
  fastCosineSimilarity(normalizedA: number[], normalizedB: number[]): number {
    let dotProduct = 0;
    for (let i = 0; i < normalizedA.length; i++) {
      dotProduct += normalizedA[i] * normalizedB[i];
    }
    return dotProduct;
  }

  /**
   * 코사인 유사도 계산
   * @param {number[]} a - 벡터 A
   * @param {number[]} b - 벡터 B
   * @returns {number} 유사도 점수
   */
  cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (normA * normB);
  }

  /**
   * FAISS 스타일 벡터 검색 (최적화된 버전)
   * @param {number[]} queryVector - 검색 쿼리 벡터
   * @param {number} k - 반환할 결과 수
   * @returns {Promise<Array>} 검색 결과
   */
  async search(queryVector: number[], k: number = 5): Promise<Array<{id: string; score: number; distance: number}>> {
    if (!this.isInitialized) {
      throw new Error('VectorStore not initialized');
    }

    if (queryVector.length !== this.dimension) {
      throw new Error(`Query vector has wrong dimension: expected ${this.dimension}, got ${queryVector.length}`);
    }

    try {
      // 쿼리 벡터 정규화
      const normalizedQuery = this.normalizeVector(queryVector);
      const similarities = [];
      
      // 최적화된 유사도 계산 (정규화된 벡터 사용)
      for (let i = 0; i < this.normalizedVectors.length; i++) {
        const similarity = this.fastCosineSimilarity(normalizedQuery, this.normalizedVectors[i]);
        similarities.push({
          index: i,
          similarity,
          id: this.metadata[i].id
        });
      }
      
      // 부분 정렬 최적화: top-k만 정렬
      const topK = this.partialSort(similarities, k);
      
      // 결과 포맷팅
      const results = topK.map(result => ({
        id: result.id,
        score: result.similarity,
        distance: 1 - result.similarity // 거리는 1 - 유사도
      }));
      
      return results;
      
    } catch (error) {
      console.error('❌ FAISS-like vector search failed:', error);
      throw error;
    }
  }

  /**
   * 부분 정렬 (Top-K 최적화)
   * @param {Array} similarities - 유사도 배열
   * @param {number} k - 상위 k개
   * @returns {Array} 상위 k개 결과
   */
  partialSort(similarities: Array<{index: number; similarity: number; id: string}>, k: number): Array<{index: number; similarity: number; id: string}> {
    // 단순한 구현: 전체 정렬 후 슬라이스
    // 실제 FAISS에서는 더 효율적인 알고리즘 사용
    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, k);
  }

  /**
   * 특정 벡터 제거
   * @param {string} queryId - 제거할 쿼리 ID
   */
  async removeVector(queryId: string): Promise<void> {
    const index = this.metadata.findIndex(meta => meta.id === queryId);
    
    if (index === -1) {
      throw new Error(`Query ID not found: ${queryId}`);
    }

    this.vectors.splice(index, 1);
    this.normalizedVectors.splice(index, 1); // 정규화된 벡터도 제거
    this.metadata.splice(index, 1);
    
    // 메타데이터 인덱스 업데이트
    for (let i = index; i < this.metadata.length; i++) {
      this.metadata[i].index = i;
    }
    
    if (!this.silent) {
      console.log(`✅ Removed vector for query: ${queryId}`);
    }
  }

  /**
   * 벡터 업데이트
   * @param {string} queryId - 업데이트할 쿼리 ID
   * @param {number[]} newVector - 새로운 벡터
   */
  async updateVector(queryId: string, newVector: number[]): Promise<void> {
    const index = this.metadata.findIndex(meta => meta.id === queryId);
    
    if (index === -1) {
      throw new Error(`Query ID not found: ${queryId}`);
    }

    if (newVector.length !== this.dimension) {
      throw new Error(`New vector has wrong dimension: expected ${this.dimension}, got ${newVector.length}`);
    }

    this.vectors[index] = newVector;
    this.normalizedVectors[index] = this.normalizeVector(newVector); // 정규화된 벡터도 업데이트
    this.metadata[index].norm = this.vectorNorm(newVector); // 노름 업데이트
    
    if (!this.silent) {
      console.log(`✅ Updated vector for query: ${queryId}`);
    }
  }

  /**
   * 벡터 저장소 정보 반환
   * @returns {object} 저장소 정보
   */
  getInfo(): {
    dimension: number | null;
    vectorCount: number;
    activeVectors: number;
    indexType: string;
    indexPath: string;
    isInitialized: boolean;
    memoryUsage: {
      vectors: number;
      normalizedVectors: number;
      metadata: number;
    };
  } {
    return {
      dimension: this.dimension,
      vectorCount: this.vectors.length,
      activeVectors: this.metadata.length,
      indexType: this.indexType,
      indexPath: 'in-memory-faiss-like',
      isInitialized: this.isInitialized,
      memoryUsage: {
        vectors: this.vectors.length * (this.dimension ?? 0) * 8, // bytes (float64)
        normalizedVectors: this.normalizedVectors.length * (this.dimension ?? 0) * 8,
        metadata: this.metadata.length * 100 // 대략적인 메타데이터 크기
      }
    };
  }

  /**
   * 리소스 정리
   */
  async cleanup(): Promise<void> {
    this.vectors = [];
    this.normalizedVectors = [];
    this.metadata = [];
    this.isInitialized = false;
    
    if (!this.silent) {
      console.log('🧹 FAISS-like VectorStore resources cleaned up');
    }
  }
}
