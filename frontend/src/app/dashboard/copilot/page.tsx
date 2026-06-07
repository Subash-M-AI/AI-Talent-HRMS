"use client";

import React, { useState } from 'react';
import { api } from '../../../lib/api';
import { Brain, Send, Sparkles } from 'lucide-react';

interface ChatTurn {
  sender: 'user' | 'copilot';
  message: string;
}

export default function CopilotDashboard() {
  const [query, setQuery] = useState('');
  const [chatLog, setChatLog] = useState<ChatTurn[]>([
    {
      sender: 'copilot',
      message: "### Welcome to TalentCopilot!\n\nI'm your AI HR Analytics Advisor. Ask me anything about your workforce - employee attrition, promotions, candidates, hiring, departments, or general HR questions.\n\nI'll provide intelligent, data-driven insights using real-time company data."
    }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const activeQuery = customQuery || query;
    if (!activeQuery.trim() || loading) return;

    const nextLog = [...chatLog, { sender: 'user', message: activeQuery } as ChatTurn];
    setChatLog(nextLog);
    setQuery('');
    setLoading(true);

    try {
      const result = await api.askCopilot(activeQuery);
      setChatLog([...nextLog, { sender: 'copilot', message: result.response }]);
    } catch (err: any) {
      setChatLog([...nextLog, { sender: 'copilot', message: `### Error\n\nFailed to get response: **${err.message || 'Server timeout'}**. Please try again.` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col justify-between space-y-6">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-text tracking-tight flex items-center gap-2">
          <Brain className="w-8 h-8 text-primary" /> HR Analytics Copilot
        </h1>
        <p className="text-muted text-sm mt-1">Converse with Gemini to query talent demographics, evaluate promotion lists, and forecast turnovers.</p>
      </div>

      {/* Chat Area (Scrolling Grid) */}
      <div className="flex-1 bg-white rounded-2xl border border-border shadow-card overflow-hidden flex flex-col">
        {/* Chat Logs */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {chatLog.map((turn, idx) => (
            <div
              key={idx}
              className={`flex gap-4 ${turn.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {turn.sender === 'copilot' && (
                <div className="w-9 h-9 rounded-xl bg-accent border border-green-200 text-primary flex items-center justify-center shrink-0">
                  <Brain className="w-5 h-5" />
                </div>
              )}
              
              <div
                className={`max-w-2xl px-5 py-4 rounded-2xl text-sm leading-relaxed ${
                  turn.sender === 'user'
                    ? 'bg-primary text-white font-semibold rounded-tr-none shadow-soft'
                    : 'bg-slate-50/70 border border-slate-100 rounded-tl-none text-text prose prose-green max-w-none'
                }`}
              >
                {turn.sender === 'user' ? (
                  <p>{turn.message}</p>
                ) : (
                  // Simple custom Markdown paragraph parser to avoid external md dependency errors
                  <div className="space-y-3 whitespace-pre-line">
                    {turn.message.split('\n\n').map((block, bIdx) => {
                      if (block.startsWith('### ')) {
                        return <h3 key={bIdx} className="text-lg font-bold text-text mt-3">{block.replace('### ', '')}</h3>;
                      }
                      if (block.startsWith('#### ')) {
                        return <h4 key={bIdx} className="text-base font-bold text-primary mt-2">{block.replace('#### ', '')}</h4>;
                      }
                      if (block.startsWith('- ') || block.startsWith('* ')) {
                        return (
                          <ul key={bIdx} className="list-disc pl-5 space-y-1.5 font-medium">
                            {block.split('\n').map((li, lIdx) => (
                              <li key={lIdx}>{li.substring(2).replace(/\*\*(.*?)\*\*/g, '$1')}</li>
                            ))}
                          </ul>
                        );
                      }
                      // bold parser
                      const parsedText = block.replace(/\*\*(.*?)\*\*/g, '$1');
                      return <p key={bIdx} className="text-text/90 font-medium">{parsedText}</p>;
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-4 justify-start">
              <div className="w-9 h-9 rounded-xl bg-accent text-primary flex items-center justify-center shrink-0 animate-pulse">
                <Brain className="w-5 h-5" />
              </div>
              <div className="px-5 py-4 rounded-2xl bg-slate-50 text-muted text-xs font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin text-primary" /> Analyzing organization charts and records...
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-border flex gap-3 bg-white">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            disabled={loading}
            placeholder="Ask TalentCopilot... (attrition, promotions, candidates, hiring, etc.)"
            className="flex-1 px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-text font-medium"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-primary hover:bg-primary-hover disabled:bg-slate-100 disabled:text-slate-400 text-white p-3 rounded-xl shadow-soft cursor-pointer transition-all flex items-center justify-center shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
