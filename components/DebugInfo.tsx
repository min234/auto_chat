import React from 'react';
import type { ChatbotResponse } from '../types';

interface DebugInfoProps {
  debugInfo: ChatbotResponse;
}

const DebugInfo: React.FC<DebugInfoProps> = ({ debugInfo }) => {
  const decisionColor = debugInfo.decision === 'answerable' ? 'text-green-400' : 'text-amber-400';

  return (
    <div className="mt-2 p-3 bg-slate-900/70 rounded-lg text-xs text-slate-400 border border-slate-700 w-full animate-fade-in-down">
      <h4 className="font-bold mb-2 text-slate-300">AI Decision Details</h4>
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-slate-400">Decision:</span>
          <span className={`font-mono ${decisionColor} bg-slate-800 px-2 py-0.5 rounded`}>{debugInfo.decision}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-slate-400">Top Similarity:</span>
          <span className="font-mono">{debugInfo.similarity_top.toFixed(4)}</span>
        </div>
        {debugInfo.optimized_query && (
          <div className="flex justify-between items-start gap-2">
            <span className="font-semibold text-slate-400 shrink-0">Optimized Query:</span>
            <span className="font-mono text-cyan-400 text-right">{debugInfo.optimized_query}</span>
          </div>
        )}
        <div className="flex justify-between items-start gap-2">
          <span className="font-semibold text-slate-400 shrink-0">Used Context IDs:</span>
          <div className="font-mono text-right flex flex-col items-end">
            {debugInfo.used_context_ids.map((id, index) => (
              <span key={index}>{id}</span>
            ))}
          </div>
        </div>
        <div className="flex justify-between items-start gap-2">
          <span className="font-semibold text-slate-400 shrink-0">Notes:</span>
          <span className="font-mono text-right">{debugInfo.notes}</span>
        </div>
      </div>
    </div>
  );
};

export default DebugInfo;