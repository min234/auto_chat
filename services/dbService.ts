
import { openDB, DBSchema } from 'idb';
import { Knowledge, VectorStore } from '../types';

const DB_NAME = 'AirBeamDB';
const DB_VERSION = 3; // Increment version for schema change

interface AirBeamDBSchema extends DBSchema {
  vectorStores: {
    key: string; // knowledgeBaseName
    value: VectorStore;
  };
  knowledgeBases: {
    key: string; // knowledgeBaseName
    value: Knowledge;
  };
  // Store a list of all knowledge base names for easy retrieval
  knowledgeBaseNames: {
    key: string; // A fixed key, e.g., 'allNames'
    value: string[];
  };
}

const dbPromise = openDB<AirBeamDBSchema>(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion, newVersion, transaction) {
    if (oldVersion < 1) {
      // Initial schema from previous version
      db.createObjectStore('vectorStore' as 'vectorStores');
      db.createObjectStore('knowledge' as 'knowledgeBases');
    }
    if (oldVersion < 2) {
      // New schema for multiple knowledge bases
      if (db.objectStoreNames.contains('vectorStore' as 'vectorStores')) {
        db.deleteObjectStore('vectorStore' as 'vectorStores');
      }
      if (db.objectStoreNames.contains('knowledge' as 'knowledgeBases')) {
        db.deleteObjectStore('knowledge' as 'knowledgeBases');
      }
      db.createObjectStore('vectorStores');
      db.createObjectStore('knowledgeBases');
      db.createObjectStore('knowledgeBaseNames');
    }
    if (oldVersion < 3) {
      // The `Knowledge` type changed from `Document[]` to `IntentKnowledgeItem[]`.
      // Clear the old store to prevent type conflicts with existing data.
      if (transaction.objectStoreNames.contains('knowledgeBases')) {
        transaction.objectStore('knowledgeBases').clear();
      }
    }
  },
});

const KNOWLEDGE_BASE_NAMES_KEY = 'allNames';

export const getVectorStore = async (knowledgeBaseName: string): Promise<VectorStore | undefined> => {
  return (await dbPromise).get('vectorStores', knowledgeBaseName);
};

export const setVectorStore = async (knowledgeBaseName: string, vectorStore: VectorStore): Promise<void> => {
  await (await dbPromise).put('vectorStores', vectorStore, knowledgeBaseName);
  await addKnowledgeBaseName(knowledgeBaseName);
};

export const getKnowledge = async (knowledgeBaseName: string): Promise<Knowledge | undefined> => {
  return (await dbPromise).get('knowledgeBases', knowledgeBaseName);
};

export const setKnowledge = async (knowledgeBaseName: string, knowledge: Knowledge): Promise<void> => {
  await (await dbPromise).put('knowledgeBases', knowledge, knowledgeBaseName);
  await addKnowledgeBaseName(knowledgeBaseName);
};

const addKnowledgeBaseName = async (name: string): Promise<void> => {
  const db = await dbPromise;
  const tx = db.transaction('knowledgeBaseNames', 'readwrite');
  let names = await tx.objectStore('knowledgeBaseNames').get(KNOWLEDGE_BASE_NAMES_KEY) || [];
  if (!names.includes(name)) {
    names.push(name);
    await tx.objectStore('knowledgeBaseNames').put(names, KNOWLEDGE_BASE_NAMES_KEY);
  }
  await tx.done;
};

export const listKnowledgeBaseNames = async (): Promise<string[]> => {
  const db = await dbPromise;
  return (await db.get('knowledgeBaseNames', KNOWLEDGE_BASE_NAMES_KEY)) || [];
};

export const deleteKnowledgeBase = async (knowledgeBaseName: string): Promise<void> => {
  const db = await dbPromise;
  const tx = db.transaction(['vectorStores', 'knowledgeBases', 'knowledgeBaseNames'], 'readwrite');
  await tx.objectStore('vectorStores').delete(knowledgeBaseName);
  await tx.objectStore('knowledgeBases').delete(knowledgeBaseName);

  let names = await tx.objectStore('knowledgeBaseNames').get(KNOWLEDGE_BASE_NAMES_KEY) || [];
  names = names.filter(name => name !== knowledgeBaseName);
  await tx.objectStore('knowledgeBaseNames').put(names, KNOWLEDGE_BASE_NAMES_KEY);
  await tx.done;
  console.log(`Knowledge base '${knowledgeBaseName}' deleted from IndexedDB.`);
};

export const clearAllDB = async (): Promise<void> => {
  const db = await dbPromise;
  await db.clear('vectorStores');
  await db.clear('knowledgeBases');
  await db.clear('knowledgeBaseNames');
  console.log('All IndexedDB knowledge bases have been cleared.');
};

// Renamed from clearDB to clearActiveKnowledgeBase for clarity
export const clearActiveKnowledgeBase = async (knowledgeBaseName: string): Promise<void> => {
  const db = await dbPromise;
  const tx = db.transaction(['vectorStores', 'knowledgeBases'], 'readwrite');
  await tx.objectStore('vectorStores').delete(knowledgeBaseName);
  await tx.objectStore('knowledgeBases').delete(knowledgeBaseName);
  await tx.done;
  console.log(`Active knowledge base '${knowledgeBaseName}' cleared from IndexedDB.`);
};
