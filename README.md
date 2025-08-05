-----

# 자연어로 SQL 쿼리를 찾아주는 MCP RAG SQL API

**MCP RAG SQL API**는 자연어로 원하는 쿼리를 입력하면, 가장 관련성 높은 SQL 쿼리를 즉시 찾아주는 방법을 제공합니다. 이 프로젝트는 E5 임베딩 모델과 인메모리 벡터 검색 기술을 결합하여 개발 생산성을 높이는 것이 목표입니다.

## ✨ 주요 기능

  * **자연어 쿼리 검색**: '월별 매출 현황', '사용자별 구매 이력'과 같이 자연어로 질문하면, 가장 적합한 SQL 쿼리 목록을 추천받을 수 있습니다.
  * **최신 E5 임베딩 모델**: OpenAI의 E5 모델을 활용해 자연어와 SQL 쿼리를 고차원 벡터로 변환하여 검색 정확도를 극대화합니다.
  * **FAISS-like 인메모리 검색**: FAISS(Facebook AI Similarity Search)와 유사한 고성능 인메모리 벡터 검색 엔진으로, 방대한 데이터 속에서도 빛의 속도로 쿼리를 찾아냅니다.
  * **MCP 프로토콜 지원**: Model-Context-Protocol(MCP)을 통해 LLM(대규모 언어 모델)과의 유연한 연동 및 실시간 시스템 모니터링을 지원합니다.
  * **간편한 HTTP API**: RESTful HTTP API를 통해 손쉽게 시스템에 통합하고 활용할 수 있습니다.

-----

## 💻 시작하기

### 요구 사항

  * **Node.js**: 18 이상
  * **RAM**: 8GB 이상 (임베딩 모델 로딩을 위해 필요합니다)
  * **디스크**: 2GB 이상

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일에서 EMBEDDING_MODEL과 PORT 등을 설정하세요.

# 개발 환경 실행
npm run dev

# 운영 환경 빌드 및 실행
npm run build && npm run start
```

### HTTP API 사용 예시

`curl`을 사용하여 서버에 쿼리를 전송하고 추천받는 방법을 확인해 보세요.

#### 쿼리 검색

```bash
curl -X POST http://localhost:7878/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "월별 매출 현황", "topK": 3}'
```

-----

## 🛠️ MCP 기반 도구

MCP 프로토콜을 활용하면 서버의 핵심 기능을 손쉽게 제어할 수 있습니다.

  * `search_queries`: 자연어로 SQL 쿼리를 검색합니다.
  * `add_query`: 새로운 SQL 쿼리 문맥을 추가하여 검색 정확도를 높입니다.
  * `remove_query`: 기존의 SQL 쿼리를 제거합니다.
  * `get_rag_stats`: RAG 시스템의 현재 통계를 조회합니다.

### MCP 서버 및 Inspector 실행

```bash
# MCP 서버 실행
node dist/index.js --mcpo

# Inspector 실행 (별도의 터미널에서 실행)
npx @modelcontextprotocol/inspector
```

Inspector를 통해 실시간으로 시스템 상태를 모니터링하고 도구를 사용할 수 있습니다.

-----

## 🚀 아키텍처 및 기술 스택

MCP RAG SQL API는 다음과 같은 기술로 구축되었습니다.

### 아키텍처

사용자의 자연어 쿼리는 **E5 임베딩 모델**을 거쳐 벡터로 변환됩니다. 이 벡터는 **인메모리 벡터 DB**에서 가장 유사한 벡터를 찾아내고, 이에 매핑된 SQL 쿼리를 사용자에게 반환하는 간단한 구조입니다.

`[자연어 쿼리] → [E5 Embedder] → [Vector Store] → [유사 SQL 쿼리 반환]`

### 기술 스택

  * **백엔드**: Node.js (ES Modules), Express.js
  * **임베딩**: `@xenova/transformers` (E5 임베딩 모델)
  * **벡터 검색**: `vectordb` (FAISS-like 인메모리 벡터 검색)
  * **프로토콜**: `@modelcontextprotocol/sdk/inspector`
  * **환경 설정**: `dotenv`

-----

## 📜 라이선스

이 프로젝트는 **MIT License**를 따릅니다. 누구나 자유롭게 사용, 수정 및 배포할 수 있습니다.
