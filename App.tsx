import React, { useState, useEffect, useCallback } from 'react';
import type { ChatMessage, IntentKnowledgeItem } from './types';
import ChatWindow from './components/ChatWindow';
import KnowledgeManager from './components/KnowledgeManager';
import { initializeVectorDB, searchSimilarDocuments } from './services/vectorDbService';
import { getOptimizedQuery, getLLMResponse } from './services/gpt40Service';
import { listKnowledgeBaseNames, deleteKnowledgeBase, getKnowledge, setKnowledge as dbSetKnowledge } from './services/dbService';

const DEFAULT_KNOWLEDGE_BASE_NAME = "AirBeam Lab";

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [knowledge, setKnowledge] = useState<IntentKnowledgeItem[]>([]);
  const [baseKnowledge, setBaseKnowledge] = useState<any[]>([]);
  const [isKbEmpty, setIsKbEmpty] = useState(false);
  
  const [isKnowledgeManagerOpen, setIsKnowledgeManagerOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  
  const [activeKnowledgeBaseName, setActiveKnowledgeBaseName] = useState<string>(
    localStorage.getItem('activeKnowledgeBaseName') || DEFAULT_KNOWLEDGE_BASE_NAME
  );
  const [availableKnowledgeBases, setAvailableKnowledgeBases] = useState<string[]>([]);
  const [knowledgeUpdateTrigger, setKnowledgeUpdateTrigger] = useState(0);

  // --- New Loading States ---
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(true);
  const [isLoadingVectorDb, setIsLoadingVectorDb] = useState(true);
  const [isVectorDbReady, setIsVectorDbReady] = useState(false);

  // Effect 1: Load available knowledge base names on startup
  useEffect(() => {
    const loadAvailableNames = async () => {
      const names = await listKnowledgeBaseNames();
      if (names.length === 0) {
        await dbSetKnowledge(DEFAULT_KNOWLEDGE_BASE_NAME, []);
        setAvailableKnowledgeBases([DEFAULT_KNOWLEDGE_BASE_NAME]);
        setActiveKnowledgeBaseName(DEFAULT_KNOWLEDGE_BASE_NAME);
        localStorage.setItem('activeKnowledgeBaseName', DEFAULT_KNOWLEDGE_BASE_NAME);
      } else {
        setAvailableKnowledgeBases(names);
        if (!names.includes(activeKnowledgeBaseName)) {
          const newActive = names[0] || DEFAULT_KNOWLEDGE_BASE_NAME;
          setActiveKnowledgeBaseName(newActive);
          localStorage.setItem('activeKnowledgeBaseName', newActive);
        }
      }
    };
    loadAvailableNames();
  }, []);

  // Effect 2: Update localStorage when activeKnowledgeBaseName changes
  useEffect(() => {
    localStorage.setItem('activeKnowledgeBaseName', activeKnowledgeBaseName);
  }, [activeKnowledgeBaseName]);

  // Effect 3 (Fast): Load text-based knowledge from DB.
  // This runs when the app starts, when the KB is switched, or when knowledge is updated.
  useEffect(() => {
    const loadKnowledge = async () => {
      if (!activeKnowledgeBaseName) return;

      console.log(`[Effect 3] Loading knowledge for: ${activeKnowledgeBaseName}`);
      setIsLoadingKnowledge(true);
      setInitError(null);
      setIsVectorDbReady(false); // Vector DB needs re-initialization

      try {
        const response = await fetch('/knowledge.json');
        if (!response.ok) throw new Error('Failed to fetch base knowledge file (knowledge.json)');
        const allData = await response.json();
        const staticKb = allData.filter((item: any) => item.type !== 'intent');
        setBaseKnowledge(staticKb);

        const dynamicKnowledge = await getKnowledge(activeKnowledgeBaseName);
        
        let knowledgeArray: IntentKnowledgeItem[] = [];
        if (Array.isArray(dynamicKnowledge)) {
          knowledgeArray = dynamicKnowledge;
        } else if (dynamicKnowledge && typeof dynamicKnowledge === 'object') {
          knowledgeArray = Object.values(dynamicKnowledge);
        }

        const uniqueKnowledge = knowledgeArray.filter((item, index, self) =>
          item && typeof item === 'object' && item.id &&
          index === self.findIndex((t) => t && t.id === item.id)
        );

        setKnowledge(uniqueKnowledge);

        const staticKnowledgeForDB = activeKnowledgeBaseName === DEFAULT_KNOWLEDGE_BASE_NAME ? staticKb : [];
        setIsKbEmpty(uniqueKnowledge.length === 0 && staticKnowledgeForDB.length === 0);

      } catch (error: any) {
        console.error(`[Effect 3] Failed to load knowledge for '${activeKnowledgeBaseName}':`, error);
        setInitError("지식 데이터를 로드하는 데 실패했습니다. 다시 시도해주세요.");
      } finally {
        setIsLoadingKnowledge(false);
        console.log(`[Effect 3] Knowledge loading finished for: ${activeKnowledgeBaseName}`);
      }
    };

    loadKnowledge();
  }, [activeKnowledgeBaseName, knowledgeUpdateTrigger]);

  // Effect 4 (Slow): Initialize Vector DB when knowledge has been loaded.
  // This runs after Effect 3 is complete and the `knowledge` state is updated.
  useEffect(() => {
    const initVectorDb = async () => {
      if (isLoadingKnowledge || !activeKnowledgeBaseName) return;

      console.log(`[Effect 4] Initializing vector DB for: ${activeKnowledgeBaseName}`);
      setIsLoadingVectorDb(true);
      setIsVectorDbReady(false);
      setInitError(null);

      if (isKbEmpty) {
        console.log(`[Effect 4] Knowledge base is empty. Skipping vector DB initialization.`);
        setIsLoadingVectorDb(false);
        setIsVectorDbReady(true); // Mark as "ready" to allow interaction, even if empty.
        return;
      }

      try {
        const staticKnowledgeForDB = activeKnowledgeBaseName === DEFAULT_KNOWLEDGE_BASE_NAME ? baseKnowledge : [];
        await initializeVectorDB(
          activeKnowledgeBaseName,
          knowledge,
          staticKnowledgeForDB
        );

        setIsVectorDbReady(true);
        setNotification(`챗봇 '${activeKnowledgeBaseName}'이(가) 준비되었습니다.`);
        setTimeout(() => setNotification(null), 3000);

      } catch (error: any) {
        console.error(`[Effect 4] Failed to initialize vector DB for '${activeKnowledgeBaseName}':`, error);
        let errorMessage = "벡터 데이터베이스 초기화에 실패했습니다. 네트워크 연결을 확인하고 잠시 후 다시 시도해주세요.";
        if (error?.status === 401) {
          errorMessage = "GPT-4o API 키 인증에 실패했습니다(401). 앱 환경에 유효한 GPT-4o API 키가 설정되었는지 확인해 주세요.";
        }
        setInitError(errorMessage);
        setIsVectorDbReady(false);
      } finally {
        setIsLoadingVectorDb(false);
        console.log(`[Effect 4] Vector DB process finished for: ${activeKnowledgeBaseName}`);
      }
    };

    initVectorDb();
  }, [knowledge, isKbEmpty, isLoadingKnowledge, activeKnowledgeBaseName, baseKnowledge]);


  const handleSendMessage = async (message: string) => {
    if (!isVectorDbReady) {
      console.error("SendMessage called while Vector DB is not ready.");
      return;
    }
    
    const userMessage: ChatMessage = { id: Date.now(), role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);
    setIsLoadingVectorDb(true); // Use the specific loading state

    try {
      const optimizedQuery = await getOptimizedQuery(messages, message);
      const searchResults = await searchSimilarDocuments(activeKnowledgeBaseName, optimizedQuery);
      
      if (searchResults.length === 0) {
         const botMessage: ChatMessage = {
          id: Date.now() + 1,
          role: 'bot',
          content: '죄송해요. 질문을 정확히 이해하지 못했어요. 어떤 정보를 찾으시나요? (회사 소개/제품/가격/AS/환불 등)',
          debugInfo: {
            decision: 'not_answerable',
            similarity_top: 0,
            used_context_ids: [],
            answer_korean: '죄송해요. 질문을 정확히 이해하지 못했어요. 어떤 정보를 찾으시나요? (회사 소개/제품/가격/AS/환불 등)',
            notes: 'No relevant documents found.',
            optimized_query: optimizedQuery
          }
        };
        setMessages(prev => [...prev, botMessage]);
        return;
      }
      
      const llmResponse = await getLLMResponse(messages, message, optimizedQuery, searchResults);

      if (llmResponse) {
        const botMessage: ChatMessage = {
          id: Date.now() + 1,
          role: 'bot',
          content: llmResponse.answer_korean,
          debugInfo: llmResponse,
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error("LLM_RESPONSE_IS_NULL");
      }
    } catch (error: any) {
      console.error("An error occurred during send message:", error);
      let content = '처리 중 오류가 발생했습니다. 관리자에게 문의하세요.';
      if (error?.status === 401) {
        content = 'API 키 인증에 실패했습니다. GPT-4o API 키가 올바르게 설정되었는지 확인해주세요.';
      }
      const errorMessage: ChatMessage = { id: Date.now() + 1, role: 'bot', content: content };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoadingVectorDb(false);
    }
  };

  const replaceKnowledge = async (newKnowledge: IntentKnowledgeItem[]) => {
    setKnowledge(newKnowledge);
    await dbSetKnowledge(activeKnowledgeBaseName, newKnowledge);
    setNotification(`지식 베이스를 파일에서 성공적으로 가져왔습니다. DB를 다시 초기화합니다...`);
    setTimeout(() => setNotification(null), 5000);
    setKnowledgeUpdateTrigger(prev => prev + 1);
  };

  const addKnowledgeItems = async (newItems: IntentKnowledgeItem[]) => {
    const updatedKnowledge = [...knowledge, ...newItems];
    setKnowledge(updatedKnowledge);
    await dbSetKnowledge(activeKnowledgeBaseName, updatedKnowledge);
    setNotification(`${newItems.length}개의 새 지식 항목이 추가되었습니다. DB를 다시 초기화합니다...`);
    setTimeout(() => setNotification(null), 3000);
    setKnowledgeUpdateTrigger(prev => prev + 1);
  };

  const deleteKnowledgeItem = async (itemId: string) => {
    const updatedKnowledge = knowledge.filter(item => item.id !== itemId);
    setKnowledge(updatedKnowledge);
    await dbSetKnowledge(activeKnowledgeBaseName, updatedKnowledge);
    setNotification(`지식 항목이 삭제되었습니다. DB를 다시 초기화합니다...`);
    setTimeout(() => setNotification(null), 2000);
    setKnowledgeUpdateTrigger(prev => prev + 1);
  };
  
  const loadAdminEdits = useCallback(() => {
    // This function is now primarily for triggering a reload when the manager opens,
    // ensuring it has the latest data from the DB.
    setKnowledgeUpdateTrigger(prev => prev + 1);
  }, []);

  const handleKnowledgeBaseChange = (name: string) => {
    console.log(`[handleKnowledgeBaseChange] Changing to: ${name}`);
    setActiveKnowledgeBaseName(name);
    setMessages([]);
  };

  const handleCreateKnowledgeBase = async (name: string) => {
    if (availableKnowledgeBases.includes(name)) {
      alert(`'${name}'이라는 이름의 지식 베이스가 이미 존재합니다.`);
      return;
    }
    
    const defaultKnowledgeItem: IntentKnowledgeItem = {
      id: `default-${Date.now()}`,
      type: 'intent',
      intent: '기본 인사',
      user_utterances: [],
      category: '기타',
      answer: '안녕하세요! 새로운 챗봇입니다. 지식 관리 메뉴에서 저에게 새로운 지식을 가르쳐주세요.'
    };

    await dbSetKnowledge(name, [defaultKnowledgeItem]);
    setKnowledge([defaultKnowledgeItem]); // Update state directly for immediate UI feedback
    setAvailableKnowledgeBases(prev => [...prev, name]);
    setActiveKnowledgeBaseName(name);
    setNotification(`새 지식 베이스 '${name}'이(가) 생성되었습니다.`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteKnowledgeBase = async (name: string) => {
    if (window.confirm(`정말로 지식 베이스 '${name}'을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      await deleteKnowledgeBase(name);
      const updatedNames = availableKnowledgeBases.filter(kbName => kbName !== name);
      setAvailableKnowledgeBases(updatedNames);
      if (activeKnowledgeBaseName === name) {
        const newActive = updatedNames[0] || DEFAULT_KNOWLEDGE_BASE_NAME;
        setActiveKnowledgeBaseName(newActive);
      }
      setNotification(`지식 베이스 '${name}'이(가) 삭제되었습니다.`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleExport = () => {
    const staticData = activeKnowledgeBaseName === DEFAULT_KNOWLEDGE_BASE_NAME ? baseKnowledge : [];
    const fullKnowledgeBase = [...staticData, ...knowledge];
    
    const jsonString = JSON.stringify(fullKnowledgeBase, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeKnowledgeBaseName}_knowledge.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="text-white min-h-screen flex flex-col items-center justify-center p-4 selection:bg-indigo-500/30">
      {notification && (
        <div className="fixed top-5 z-50 bg-indigo-600/90 backdrop-blur-sm border border-indigo-500 text-white py-2 px-5 rounded-full shadow-lg animate-fade-in-down text-sm">
          {notification}
        </div>
      )}
      <div className="w-full max-w-3xl mx-auto flex flex-col h-[calc(100vh-2rem)]">
        <header className="py-5 text-center relative flex items-center justify-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">{activeKnowledgeBaseName} AI 챗봇</h1>
            <p className="text-sm text-slate-400">실내 공기질에 대해 무엇이든 물어보세요.</p>
          </div>
          <button 
            onClick={() => setIsKnowledgeManagerOpen(true)}
            className="absolute top-1/2 right-0 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors bg-slate-800/50 hover:bg-slate-700/50 rounded-full p-2"
            aria-label="Manage Knowledge Base"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </button>
        </header>
        <main className="flex-grow flex flex-col min-h-0 py-4">
          <ChatWindow
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoadingKnowledge || isLoadingVectorDb}
            initError={initError}
            botName={activeKnowledgeBaseName}
            isKbEmpty={isKbEmpty}
          />
        </main>
      </div>
      {isKnowledgeManagerOpen && (
        <KnowledgeManager
          currentKnowledge={knowledge}
          onAddItems={addKnowledgeItems}
          onDeleteItem={deleteKnowledgeItem}
          onReplaceItems={replaceKnowledge}
          onClose={() => setIsKnowledgeManagerOpen(false)}
          onLoadAdminEdits={loadAdminEdits}
          activeKnowledgeBaseName={activeKnowledgeBaseName}
          availableKnowledgeBases={availableKnowledgeBases}
          onKnowledgeBaseChange={handleKnowledgeBaseChange}
          onCreateKnowledgeBase={handleCreateKnowledgeBase}
          onDeleteKnowledgeBase={handleDeleteKnowledgeBase}
          onExport={handleExport}
        />
      )}
    </div>
  );
};

export default App;