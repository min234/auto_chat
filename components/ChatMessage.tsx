import React, { useState } from 'react';
import type { ChatMessage } from '../types';
import DebugInfo from './DebugInfo';

interface ChatMessageProps {
  message: ChatMessage;
  isLoading?: boolean;
}

const ChatMessageItem: React.FC<ChatMessageProps> = ({ message, isLoading = false }) => {
  const [showDebug, setShowDebug] = useState(false);
  const isUser = message.role === 'user';

  const botAvatar = (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-lg">
      AI
    </div>
  );

  const userAvatar = (
    <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 text-sm shrink-0 shadow-lg">
      U
    </div>
  );

  return (
    <div className={`flex items-end gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {isUser ? userAvatar : botAvatar}
      <div className={`flex flex-col w-full max-w-lg ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`p-4 rounded-lg shadow-md ${isUser ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none'}`}>
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
          )}
        </div>
        {!isUser && message.debugInfo && (
           <button onClick={() => setShowDebug(!showDebug)} className="text-xs text-slate-500 hover:text-indigo-400 mt-2 px-2 py-1 flex items-center gap-1 transition-colors">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
            {showDebug ? '세부 정보 숨기기' : 'AI 결정 과정 보기'}
          </button>
        )}
        {showDebug && message.debugInfo && <DebugInfo debugInfo={message.debugInfo} />}
      </div>
    </div>
  );
};

export default ChatMessageItem;