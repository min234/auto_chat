import type { Document, SearchResult, IntentKnowledgeItem, VectorStore, Knowledge } from '../types';
import { TOP_K } from '../constants';
import { getVectorStore, setVectorStore, getKnowledge, setKnowledge } from './dbService';

// In-memory cache for active knowledge bases
const activeDocumentVectors = new Map<string, VectorStore>();
const activeDocuments = new Map<string, Document[]>();

const API_BASE_URL = 'http://localhost:3001';

const getEmbeddings = async (input: string | string[]) => {
  const response = await fetch(`${API_BASE_URL}/api/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Failed to get embeddings: ${errorBody.error || response.statusText}`);
  }

  return response.json();
};


const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  return dotProduct / (magnitudeA * magnitudeB);
};

const processKnowledgeBase = (dynamicIntents: IntentKnowledgeItem[], staticKnowledge: any[]): Document[] => {
  // Defensive check to prevent runtime errors if dynamicIntents is not an array
  if (!Array.isArray(dynamicIntents)) {
    console.warn('Warning: processKnowledgeBase received a non-array value for dynamicIntents. Defaulting to an empty array.');
    dynamicIntents = [];
  }

  const processedDocs: Document[] = dynamicIntents
    .map((item: any) => ({
      id: item.id,
      content: `주제: ${item.intent}. 내용: ${item.answer}`
    }));

  const companyProfile = staticKnowledge.find(item => item.type === 'company_profile') as any;
  if (companyProfile) {
    const brandName = companyProfile.brand || 'the company';
    processedDocs.push({
      id: `${companyProfile.id}-summary`,
      content: `${brandName}은(는) '${companyProfile.one_liner}'인 스타트업입니다. ${companyProfile.founded}년에 설립되었으며, 본사는 ${companyProfile.hq}에 위치해 있습니다.`
    });
    processedDocs.push({
      id: `${companyProfile.id}-products`,
      content: `${brandName}의 주요 제품 라인업은 ${companyProfile.core_products.join(', ')}으로 구성됩니다. 각 제품은 실내 공기질을 측정하고 관리하는 데 도움을 줍니다.`
    });
    processedDocs.push({
      id: `${companyProfile.id}-channels`,
      content: `${brandName} 제품은 ${companyProfile.channels.join(', ')}을 통해 구매하거나 이용할 수 있습니다.`
    });
    processedDocs.push({
      id: `${companyProfile.id}-contact`,
      content: `${brandName} 고객센터에 문의하려면 이메일(${companyProfile.contact.cs_email}) 또는 전화(${companyProfile.contact.cs_tel})를 이용할 수 있습니다. 카카오톡 채널 '${companyProfile.contact.kakao}'으로도 문의 가능하며, 운영 시간은 평일 ${companyProfile.contact.biz_hours}입니다.`
    });
    processedDocs.push({
      id: `${companyProfile.id}-warranty`,
      content: `${brandName}의 모든 기기 제품에는 ${companyProfile.policies.warranty}이 적용됩니다.`
    });
    processedDocs.push({
      id: `${companyProfile.id}-return`,
      content: `${brandName} 제품의 반품 정책은, ${companyProfile.policies.return}입니다.`
    });
    processedDocs.push({
      id: `${companyProfile.id}-repair`,
      content: `제품 수리(AS)가 필요한 경우, ${companyProfile.policies.repair}을 통해 진행할 수 있습니다.`
    });
    processedDocs.push({
      id: `${companyProfile.id}-subscription`,
      content: `${brandName}의 구독 서비스는 ${companyProfile.policies.subscription} 정책을 따릅니다.`
    });
  }
  
  return processedDocs;
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const initializeVectorDB = async (knowledgeBaseName: string, dynamicIntents: IntentKnowledgeItem[], staticKnowledge: any[]) => {
  console.log(`[VectorDB] Initializing for '${knowledgeBaseName}'...`);

  const storedVectors = await getVectorStore(knowledgeBaseName);
  
  // --- New, more reliable cache validation logic ---
  const currentDocIds = new Set(dynamicIntents.map(item => item.id));
  const cachedDocIds = storedVectors ? new Set(Object.keys(storedVectors)) : new Set();

  let isCacheValid = false;
  if (storedVectors && currentDocIds.size === cachedDocIds.size) {
    isCacheValid = true;
    for (const id of currentDocIds) {
      if (!cachedDocIds.has(id)) {
        isCacheValid = false;
        break;
      }
    }
  }
  // --- End of new logic ---

  if (isCacheValid) {
    console.log(`[VectorDB] Cache is valid. Initializing from IndexedDB for '${knowledgeBaseName}'.`);
    const documents = processKnowledgeBase(dynamicIntents, staticKnowledge); // Use current intents
    activeDocumentVectors.set(knowledgeBaseName, storedVectors);
    activeDocuments.set(knowledgeBaseName, documents);
    console.log(`[VectorDB] Initialized from cache with ${documents.length} documents.`);
    return;
  }

  console.log(`[VectorDB] Cache is invalid or missing for '${knowledgeBaseName}'. Rebuilding database...`);
  
  const documentsToProcess = processKnowledgeBase(dynamicIntents, staticKnowledge);
  
  if (documentsToProcess.length === 0) {
    console.warn(`[VectorDB] No documents to process. Initialization skipped.`);
    activeDocumentVectors.set(knowledgeBaseName, {});
    activeDocuments.set(knowledgeBaseName, []);
    await setVectorStore(knowledgeBaseName, {}); // Clear any potentially stale vectors
    return;
  }

  const CHUNK_SIZE = 50;
  
  try {
    console.log(`[VectorDB] Generating embeddings for ${documentsToProcess.length} documents...`);
    const allEmbeddings: { [key: string]: number[] } = {};

    for (let i = 0; i < documentsToProcess.length; i += CHUNK_SIZE) {
      const chunkDocs = documentsToProcess.slice(i, i + CHUNK_SIZE);
      const chunkContents = chunkDocs.map(doc => doc.content);
      
      const result = await getEmbeddings(chunkContents);
      
      result.data.forEach((embeddingObject: any, index: number) => {
        const docId = chunkDocs[index].id;
        allEmbeddings[docId] = embeddingObject.embedding;
      });

      console.log(`[VectorDB] Processed chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(documentsToProcess.length / CHUNK_SIZE)}`);
      
      if (i + CHUNK_SIZE < documentsToProcess.length) {
        await delay(200);
      }
    }
    
    activeDocumentVectors.set(knowledgeBaseName, allEmbeddings);
    activeDocuments.set(knowledgeBaseName, documentsToProcess);
    console.log(`[VectorDB] Database rebuilt successfully with ${Object.keys(allEmbeddings).length} vectors.`);

    console.log(`[VectorDB] Saving new vectors and knowledge to IndexedDB for '${knowledgeBaseName}'...`);
    await setVectorStore(knowledgeBaseName, allEmbeddings);
    await setKnowledge(knowledgeBaseName, dynamicIntents); 
    console.log("[VectorDB] Save complete.");

  } catch (error) {
    console.error(`[VectorDB] Failed to initialize vector database for '${knowledgeBaseName}':`, error);
    activeDocumentVectors.set(knowledgeBaseName, {});
    activeDocuments.set(knowledgeBaseName, []);
    throw error;
  }
};

export const searchSimilarDocuments = async (knowledgeBaseName: string, query: string): Promise<SearchResult[]> => {
  const currentDocumentVectors = activeDocumentVectors.get(knowledgeBaseName) || {};
  const currentDocuments = activeDocuments.get(knowledgeBaseName) || [];

  if (Object.keys(currentDocumentVectors).length === 0) {
    console.warn(`Vector DB for '${knowledgeBaseName}' not initialized or failed to initialize.`);
    return [];
  }
  
  try {
    const response = await getEmbeddings(query);
    const queryVector = response.data[0].embedding;

    const similarities = currentDocuments.map((doc, index) => {
      const docVector = currentDocumentVectors[doc.id];
      if (!docVector) return { id: index, similarity: 0, document: doc };
      return {
        id: index,
        similarity: cosineSimilarity(queryVector, docVector),
        document: doc
      };
    });

    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.slice(0, TOP_K);
  } catch (error) {
    console.error("Error searching for similar documents:", error);
    return [];
  }
};