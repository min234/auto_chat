import React, { useState, useRef, useEffect } from 'react';
import type { IntentKnowledgeItem, GoogleAuthTokens } from '../types';
import { generateKnowledgeBaseJSON } from '../services/gpt40Service';
import { initGoogleClients, handleAuthClick, showPicker, getFileContent } from '../services/googleDriveService';

interface KnowledgeManagerProps {
  currentKnowledge: IntentKnowledgeItem[];
  onAddItems: (newItems: IntentKnowledgeItem[]) => void;
  onDeleteItem: (itemId: string) => void;
  onReplaceItems: (newKnowledge: IntentKnowledgeItem[]) => void;
  onClose: () => void;
  onLoadAdminEdits: () => void;
  activeKnowledgeBaseName: string;
  availableKnowledgeBases: string[];
  onKnowledgeBaseChange: (name: string) => void;
  onCreateKnowledgeBase: (name: string) => void;
  onDeleteKnowledgeBase: (name: string) => void;
  onExport: () => void;
}

const KnowledgeManager: React.FC<KnowledgeManagerProps> = ({
  currentKnowledge,
  onAddItems,
  onDeleteItem,
  onReplaceItems,
  onClose,
  onLoadAdminEdits,
  activeKnowledgeBaseName,
  availableKnowledgeBases,
  onKnowledgeBaseChange,
  onCreateKnowledgeBase,
  onDeleteKnowledgeBase,
  onExport,
}) => {
  const [newText, setNewText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [gapiReady, setGapiReady] = useState(false);
  const [googleAuthTokens, setGoogleAuthTokens] = useState<GoogleAuthTokens | null>(null);
  const [newKnowledgeBaseName, setNewKnowledgeBaseName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onLoadAdminEdits();
    initGoogleClients().then(() => {
      setGapiReady(true);
    }).catch(error => {
      console.error("Google Client init failed:", error);
    });
  }, []);

  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.origin !== 'http://localhost:3001' && event.origin !== window.location.origin) {
        return;
      }
      if (event.data && event.data.type === 'google-auth-tokens') {
        setGoogleAuthTokens(event.data.tokens);
        alert('Google 인증에 성공했습니다. 이제 Google Drive에서 파일을 가져올 수 있습니다.');
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => {
      window.removeEventListener('message', handleAuthMessage);
    };
  }, []);


  const handleAddFromText = async () => {
    if (!newText.trim()) return;
    setIsProcessing(true);
    try {
      const newItems = await generateKnowledgeBaseJSON(newText);
      if (newItems.length > 0) {
        onAddItems(newItems);
        setNewText('');
      } else {
        alert("제공된 텍스트를 처리할 수 없습니다. 내용을 확인하고 다시 시도해 주세요.");
      }
    } catch (error) {
      console.error("Failed to add knowledge from text:", error);
      alert("텍스트를 처리하는 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoogleImportClick = async () => {
    if (!googleAuthTokens?.access_token) {
      await handleAuthClick();
      return;
    }

    setIsProcessing(true);
    try {
      const pickedFiles = await showPicker(googleAuthTokens.access_token);
      let allNewItems: IntentKnowledgeItem[] = [];

      // Process files one by one to avoid overwhelming the user with prompts/errors
      for (const file of pickedFiles) {
        // getFileContent now returns an object { content: string[] }
        const contentUnits = await getFileContent(file.id, file.mimeType, googleAuthTokens.access_token);

        if (contentUnits.length === 0) {
          continue; // Skip empty files
        }

        // Create a promise for each content unit (row/paragraph)
        const generationPromises = contentUnits.map(unit => generateKnowledgeBaseJSON(unit));
        
        // Wait for all generation tasks for the current file to complete
        const results = await Promise.all(generationPromises);
        
        // Flatten the array of arrays and add to the main list
        const newItemsForFile = results.flat();
        
        if (newItemsForFile.length > 0) {
          allNewItems = [...allNewItems, ...newItemsForFile];
        }
      }
      
      if (allNewItems.length > 0) {
        onAddItems(allNewItems);
        alert(`${allNewItems.length}개의 새 지식 항목을 Google Drive에서 가져왔습니다.`);
      } else {
        alert("선택한 파일에서 유효한 지식 항목을 추출하지 못했습니다.");
      }

    } catch (error) {
      console.error("Google Drive import failed:", error);
      if (error !== 'Picker cancelled') {
        alert("Google Drive에서 파일을 가져오는 중 오류가 발생했습니다.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteItem = (idToDelete: string) => {
    if (window.confirm("정말로 이 지식 항목을 삭제하시겠습니까?")) {
      onDeleteItem(idToDelete);
    }
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('File content is not a string.');
        }
        const parsedData = JSON.parse(text);
        
        const intentData = parsedData.filter((item: any) => item.type === 'intent');

        if (Array.isArray(intentData) && intentData.every(item => 'intent' in item && 'answer' in item)) {
           if (window.confirm(`현재 지식 베이스 '${activeKnowledgeBaseName}'을(를) 새로 가져온 파일로 교체하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
            onReplaceItems(intentData);
            alert('지식 베이스를 성공적으로 가져왔습니다.');
          }
        } else {
          throw new Error('Invalid JSON structure or no "intent" type data found.');
        }
      } catch (error) {
        console.error("Failed to import knowledge base:", error);
        alert('파일을 가져오는 데 실패했습니다. 파일이 올바른 JSON 형식인지 확인해주세요.');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-down" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-slate-700 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-bold text-white">지식 베이스 관리 (AI의 교과서)</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        
        <div className="flex-grow p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
          {/* Knowledge Base Selector and Creator */}
          <div className="bg-slate-800/50 p-5 rounded-lg flex flex-col gap-4 border border-slate-700 col-span-2">
            <h3 className="font-semibold text-indigo-400">챗봇 선택 및 관리</h3>
            <div className="flex flex-col md:flex-row gap-3">
              <select
                value={activeKnowledgeBaseName}
                onChange={(e) => onKnowledgeBaseChange(e.target.value)}
                className="flex-grow bg-slate-900 border border-slate-700 rounded-md p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                {availableKnowledgeBases.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <input
                type="text"
                value={newKnowledgeBaseName}
                onChange={(e) => setNewKnowledgeBaseName(e.target.value)}
                placeholder="새 챗봇 이름"
                className="flex-grow bg-slate-900 border border-slate-700 rounded-md p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
              <button
                onClick={() => {
                  if (newKnowledgeBaseName.trim()) {
                    onCreateKnowledgeBase(newKnowledgeBaseName.trim());
                    setNewKnowledgeBaseName('');
                  }
                }}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-4 rounded-md transition duration-200 shrink-0"
              >
                새 챗봇 생성
              </button>
              {activeKnowledgeBaseName !== "AirBeam Lab" && ( // Prevent deleting default KB
                <button
                  onClick={() => onDeleteKnowledgeBase(activeKnowledgeBaseName)}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-4 rounded-md transition duration-200 shrink-0"
                >
                  현재 챗봇 삭제
                </button>
              )}
            </div>
            <p className="text-sm text-slate-400 -mt-2">현재 활성 챗봇: <span className="font-bold text-white">{activeKnowledgeBaseName}</span></p>
          </div>

          {/* Add & Manage Knowledge Section */}
          <div className="bg-slate-800/50 p-5 rounded-lg flex flex-col gap-4 border border-slate-700">
            <h3 className="font-semibold text-indigo-400">텍스트에서 새 지식 추가</h3>
            <p className="text-sm text-slate-400 -mt-2">문서나 시트의 텍스트를 붙여넣으세요. AI가 자동으로 구조화하여 새 지식 항목으로 만듭니다.</p>
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="여기에 지식 콘텐츠를 붙여넣으세요..."
              className="w-full flex-grow bg-slate-900 border border-slate-700 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              disabled={isProcessing}
              rows={6}
            />
            <button
              onClick={handleAddFromText}
              disabled={isProcessing || !newText.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-2.5 px-4 rounded-md transition duration-200 w-full"
            >
              {isProcessing ? '처리 중...' : '처리 및 추가'}
            </button>
            <div className="border-t border-slate-700 my-2"></div>
            <h3 className="font-semibold text-indigo-400">데이터 관리</h3>
             <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={handleImportClick}
                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 px-4 rounded-md transition duration-200"
                >
                    파일 가져오기
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json"
                    className="hidden"
                />
                <button
                    onClick={handleGoogleImportClick}
                    disabled={!gapiReady || isProcessing}
                    className="bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-2.5 px-4 rounded-md transition duration-200"
                >
                    Google Drive에서 가져오기
                </button>
                 <button
                    onClick={onExport}
                    className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2.5 px-4 rounded-md transition duration-200 col-span-2"
                >
                    내보내기 (Export to JSON)
                </button>
            </div>
            <div className="text-xs text-slate-500 mt-2 p-3 bg-slate-800 rounded-md space-y-2">
              <p className="font-semibold text-amber-400">AI는 어떻게 지식을 아나요? (오픈북 시험)</p>
              <p>챗봇 AI는 `knowledge.json` 파일을 '교과서'처럼 사용합니다. 사용자의 질문과 가장 관련된 내용을 이 파일에서 찾아서 답변을 만듭니다. 이 화면의 수정 내용은 관리자님의 브라우저에만 임시 저장됩니다.</p>
              <p className="font-semibold text-slate-400">모든 사용자에게 '새 교과서'를 적용하려면:</p>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>여기서 지식 수정을 모두 완료합니다.</li>
                <li><strong>[내보내기]</strong>를 눌러 최신 `knowledge.json` 파일을 다운로드합니다.</li>
                <li>다운로드한 파일로 프로젝트의 원본 파일을 덮어쓴 후, 앱을 다시 배포해야 합니다.</li>
              </ol>
            </div>
          </div>

          {/* Current Knowledge Section */}
          <div className="flex flex-col">
            <h3 className="font-semibold text-indigo-400 mb-2">현재 지식 항목 ({currentKnowledge.length})</h3>
            <div className="space-y-3 overflow-y-auto pr-2 flex-grow">
              {currentKnowledge.length === 0 ? (
                <div className="text-center text-slate-500 p-8 border-2 border-dashed border-slate-700 rounded-lg h-full flex items-center justify-center">
                  지식 베이스가 비어있습니다.
                </div>
              ) : (Array.isArray(currentKnowledge) && currentKnowledge.map((item) => (
                <div key={item.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 hover:border-indigo-500/50 transition-colors duration-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-base text-cyan-400">{item.intent}</p>
                      <p className="text-xs font-mono text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full inline-block mt-1">{item.category}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteItem(item.id)}
                      className="ml-4 text-slate-500 hover:text-red-500 shrink-0 transition-colors"
                      aria-label={`Delete ${item.intent}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm1 4a1 1 0 100 2h2a1 1 0 100-2H8z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-slate-300 mt-2">{item.answer}</p>
                </div>
              )))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeManager;