import { pipeline, env } from '@xenova/transformers';
import dotenv from 'dotenv';

// .env 파일 로드
dotenv.config();

// Transformers.js 환경 설정
env.allowLocalModels = false;
env.useBrowserCache = false;

export interface E5EmbedderOptions {
    silent?: boolean;
}

export class E5Embedder {
    public model: any;
    public modelName: string;
    public isInitialized: boolean;
    public silent: boolean;

    constructor(options: E5EmbedderOptions = {}) {
        this.model = null;
        this.modelName = process.env.EMBEDDING_MODEL || 'Xenova/e5-large-v2';
        this.isInitialized = false;
        this.silent = options.silent || false;
    }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      if (!this.silent) {
        console.log(`🤖 Loading E5 embedding model: ${this.modelName}`);
      }
      
      // E5 모델 로드 (feature-extraction 파이프라인 사용)
      this.model = await pipeline('feature-extraction', this.modelName);
      
      this.isInitialized = true;
      if (!this.silent) {
        console.log('✅ E5 embedding model loaded successfully');
      }
      
    } catch (error) {
      console.error('❌ Failed to load E5 model:', error);
      if (error instanceof Error) {
        throw new Error(`E5 model initialization failed: ${error.message}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * 텍스트를 E5 임베딩으로 변환
   * @param {string} text - 임베딩할 텍스트
   * @param {string} prefix - E5 모델에 사용할 접두사 ('query: ' 또는 'passage: ')
   * @returns {Promise<number[]>} 임베딩 벡터
   */
  async embed(text: string, prefix: string = 'query: '): Promise<number[]> {
    if (!this.isInitialized) {
      throw new Error('E5Embedder not initialized. Call initialize() first.');
    }

    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }

    try {
      // E5 모델은 접두사가 중요함
      const prefixedText = `${prefix}${text.trim()}`;
      
      // 임베딩 생성
      const output = await this.model(prefixedText, {
        pooling: 'mean',
        normalize: true
      });

      // 텐서를 배열로 변환 (number[] 보장)
      const embedding = Array.from(output.data as Iterable<number>);
      return embedding;
      
    } catch (error) {
      console.error('❌ Embedding generation failed:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to generate embedding: ${error.message}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * 배치로 여러 텍스트를 임베딩
   * @param {string[]} texts - 임베딩할 텍스트 배열
   * @param {string} prefix - E5 모델에 사용할 접두사
   * @returns {Promise<number[][]>} 임베딩 벡터 배열
   */
  async embedBatch(texts: string[], prefix: string = 'query: '): Promise<number[][]> {
    if (!Array.isArray(texts)) {
      throw new Error('Texts must be an array');
    }

    const embeddings = [];
    
    for (const text of texts) {
      const embedding = await this.embed(text, prefix);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  /**
   * 쿼리용 임베딩 생성 (검색 시 사용)
   * @param {string} query - 검색 쿼리
   * @returns {Promise<number[]>} 쿼리 임베딩
   */
  async embedQuery(query: string): Promise<number[]> {
    return await this.embed(query, 'query: ');
  }

  /**
   * 문서용 임베딩 생성 (인덱싱 시 사용)
   * @param {string} document - 문서 텍스트
   * @returns {Promise<number[]>} 문서 임베딩
   */
  async embedDocument(document: string): Promise<number[]> {
    return await this.embed(document, 'passage: ');
  }

  /**
   * 임베딩 차원 반환
   * @returns {number} 임베딩 벡터의 차원
   */
  getDimension() {
    // E5-large-v2 embedding dimension
    return 1024;
  }

  /**
   * 모델 정보 반환
   * @returns {object} 모델 정보
   */
  getModelInfo() {
    return {
      name: this.modelName,
      dimension: this.getDimension(),
      isInitialized: this.isInitialized
    };
  }

  /**
   * 리소스 정리
   */
  async cleanup() {
    this.model = null;
    this.isInitialized = false;
    if (!this.silent) {
      console.log('🧹 E5Embedder resources cleaned up');
    }
  }
}
