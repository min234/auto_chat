import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import ChatMessageItem from './ChatMessage';

interface ChatWindowProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  initError: string | null;
  botName: string;
  isKbEmpty?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onSendMessage, isLoading, initError, botName, isKbEmpty }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden backdrop-blur-sm">
      <div className="flex-grow p-6 overflow-y-auto">
        {initError ? (
          <div className="text-center text-amber-300 mt-8 flex flex-col items-center justify-center h-full animate-fade-in-down">
            <div className="p-4 bg-amber-900/50 rounded-full mb-4 border border-amber-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="font-bold text-lg text-amber-200">챗봇 초기화 오류</p>
            <p className="text-sm mt-2 max-w-md">{initError}</p>
            <p className="text-xs text-slate-400 mt-4">올바른 API 키를 설정한 후 앱을 새로고침해주세요.</p>
          </div>
        ) : messages.length === 0 && !isLoading ? (
          <div className="text-center text-slate-500 mt-8 flex flex-col items-center justify-center h-full">
              <div className="p-4 bg-slate-800/50 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <p className="font-semibold text-slate-300">안녕하세요! {botName} AI 챗봇입니다.</p>
              <p className="text-sm">무엇이든 물어보시면, 아는만큼 답해드릴게요.</p>
          </div>
        ) : null}
        <div className="flex flex-col space-y-5">
          {messages.map((msg) => (
            <ChatMessageItem message={msg} />
          ))}
          {isLoading && messages.length > 0 && <ChatMessageItem key="loading" message={{id: 0, role: 'bot', content: '...'}} isLoading={true} />}
          {isLoading && messages.length === 0 && !initError && (
             <div className="text-center text-slate-500 mt-8 flex flex-col items-center justify-center h-full">
                <p>데이터베이스를 초기화하고 있습니다...</p>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 bg-slate-900/80 border-t border-slate-700/50">
        {isKbEmpty && (
          <div className="text-center text-sm text-slate-400 mb-3">
            지식 베이스가 비어있습니다. 우측 상단의 '지식 관리' 버튼을 눌러 데이터를 추가해주세요.
          </div>
        )}
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isLoading ? "AI가 응답을 준비중입니다..." : "메시지를 입력하세요..."}
            className="w-full bg-slate-800 border border-slate-700 rounded-full py-3 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
            disabled={isLoading || initError !== null}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim() || initError !== null}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold p-3 rounded-full transition duration-200 flex items-center justify-center shrink-0 aspect-square"
            aria-label="Send Message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;