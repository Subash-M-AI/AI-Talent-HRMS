"use client";

import React, { useState, useEffect } from 'react';
import { api } from '../../../../lib/api';
import { FileCode, Play, Terminal, HelpCircle, Code2, RefreshCw, Send, ChevronRight, Folder, File, Sparkles } from 'lucide-react';

interface ChatTurn {
  sender: 'user' | 'ai';
  message: string;
}

export default function CodingWorkspace() {
  const [code, setCode] = useState(`def solve_anagrams(strs):\n    # Write your solution here\n    from collections import defaultdict\n    anagrams = defaultdict(list)\n    for s in strs:\n        sorted_s = "".join(sorted(s))\n        anagrams[sorted_s].append(s)\n    return list(anagrams.values())\n\n# Example Test\nprint(solve_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))\n`);
  
  const [activeFile, setActiveFile] = useState('solution.py');
  const [terminalOutput, setTerminalOutput] = useState([
    "Microsoft Windows [Version 10.0.22631]",
    "(c) Microsoft Corporation. All rights reserved.",
    "",
    "C:\\workspace\\candidate_test> python --version",
    "Python 3.11.4",
    "C:\\workspace\\candidate_test> _"
  ]);
  
  const [running, setRunning] = useState(false);
  const [query, setQuery] = useState('');
  const [chatLog, setChatLog] = useState<ChatTurn[]>([
    {
      sender: 'ai',
      message: "Hello! I am your docked Coding Copilot. Ask me for hints, clarification, or optimization tips regarding your anagram challenge."
    }
  ]);
  const [copilotLoading, setCopilotLoading] = useState(false);

  const runCode = () => {
    setRunning(true);
    setTerminalOutput(prev => [...prev, "C:\\workspace\\candidate_test> python solution.py"]);
    
    setTimeout(() => {
      setTerminalOutput(prev => [
        ...prev,
        "[RUNNING TESTS] Executing test suite for solve_anagrams...",
        "Test Case 1 (Standard anagrams list): PASSED",
        "Test Case 2 (Empty array evaluation): PASSED",
        "Test Case 3 (Single word inputs list): PASSED",
        "",
        "[OUTPUT] [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]",
        "SUCCESS: 3/3 tests passed successfully. Execution took 12ms.",
        "C:\\workspace\\candidate_test> _"
      ]);
      setRunning(false);
    }, 1200);
  };

  const handleAskCopilot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || copilotLoading) return;

    const nextLog = [...chatLog, { sender: 'user', message: query } as ChatTurn];
    setChatLog(nextLog);
    setQuery('');
    setCopilotLoading(true);

    try {
      // Use general copilot API or mock response for code queries
      const prompt = `Help with coding question in VS Code workspace: ${query}. Current code context:\n${code}`;
      const result = await api.askCopilot(prompt);
      setChatLog([...nextLog, { sender: 'ai', message: result.response }]);
    } catch (err: any) {
      setChatLog([...nextLog, { sender: 'ai', message: `I was unable to compile a hint right now: ${err.message || 'connection issue'}` }]);
    } finally {
      setCopilotLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex border border-[#1e1e1e] rounded-xl overflow-hidden font-mono bg-[#1e1e1e] text-[#d4d4d4] select-none">
      {/* Icon Activity Bar (Leftmost 50px) */}
      <div className="w-14 bg-[#333333] border-r border-[#252526] flex flex-col items-center py-4 justify-between select-none">
        <div className="space-y-4">
          <button className="p-2 text-white hover:bg-[#444444] rounded-lg transition-colors cursor-pointer block">
            <FileCode className="w-5 h-5 text-primary" />
          </button>
          <button className="p-2 text-slate-400 hover:text-white hover:bg-[#444444] rounded-lg transition-colors cursor-pointer block">
            <Code2 className="w-5 h-5" />
          </button>
        </div>
        <button className="p-2 text-slate-400 hover:text-white hover:bg-[#444444] rounded-lg transition-colors cursor-pointer block">
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Explorer Drawer (200px) */}
      <div className="w-48 bg-[#252526] border-r border-[#1e1e1e] flex flex-col py-3 select-none text-xs">
        <span className="px-4 font-bold text-[10px] text-slate-400 uppercase tracking-widest block mb-3">Explorer</span>
        <div className="space-y-1">
          <div className="px-4 py-1 flex items-center gap-1.5 font-bold text-slate-300">
            <Folder className="w-3.5 h-3.5 text-secondary" /> workspace
          </div>
          <button
            onClick={() => setActiveFile('solution.py')}
            className={`w-full px-7 py-1 text-left flex items-center gap-1.5 cursor-pointer ${
              activeFile === 'solution.py' ? 'bg-[#37373d] text-white font-bold' : 'hover:bg-[#2a2a2b]'
            }`}
          >
            <File className="w-3.5 h-3.5 text-primary" /> solution.py
          </button>
          <button
            onClick={() => setActiveFile('instructions.md')}
            className={`w-full px-7 py-1 text-left flex items-center gap-1.5 cursor-pointer ${
              activeFile === 'instructions.md' ? 'bg-[#37373d] text-white font-bold' : 'hover:bg-[#2a2a2b]'
            }`}
          >
            <File className="w-3.5 h-3.5 text-[#3b82f6]" /> instructions.md
          </button>
        </div>
      </div>

      {/* Main Editor & Terminal Block (Middle columns - flex-1) */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
        {/* Editor Tabs Header */}
        <div className="h-9 bg-[#2d2d2d] flex items-center border-b border-[#1e1e1e]">
          <span className="bg-[#1e1e1e] text-white text-xs px-4 py-2 border-t-2 border-primary flex items-center gap-2 font-bold select-none">
            {activeFile}
          </span>
        </div>

        {/* Text Area Code Editor */}
        <div className="flex-1 p-4 relative font-mono text-sm leading-relaxed overflow-y-auto">
          {activeFile === 'solution.py' ? (
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full h-full bg-transparent resize-none border-none outline-none focus:ring-0 text-[#d4d4d4] font-mono leading-relaxed"
              spellCheck="false"
            />
          ) : (
            <div className="text-xs text-[#a3a3a3] space-y-3 font-sans max-w-xl leading-relaxed">
              <h3 className="text-base font-bold text-white mb-2">Anagram Combinations</h3>
              <p>Write a python function **solve_anagrams(strs)** that takes an array of strings as input and groups the anagrams together. You can return the answer in any order.</p>
              <p className="bg-[#2d2d2d] p-3 rounded-lg border border-border/10 font-mono text-white text-[11px] leading-tight">
                strs = ["eat", "tea", "tan", "ate", "nat", "bat"]<br />
                Output: [["eat","tea","ate"],["tan","nat"],["bat"]]
              </p>
              <h5 className="font-bold text-white mt-4">Evaluation Criteria:</h5>
              <ul className="list-disc pl-5 space-y-1">
                <li>Functional correctness (handles empty array / inputs).</li>
                <li>Algorithm complexity should ideally be O(N * K log K).</li>
              </ul>
            </div>
          )}
        </div>

        {/* Output Console / Terminal */}
        <div className="h-44 bg-[#1e1e1e] border-t-2 border-[#2d2d2d] flex flex-col font-mono text-xs select-none">
          <div className="h-8 bg-[#252526] px-4 flex items-center justify-between border-b border-[#1e1e1e]">
            <span className="flex items-center gap-1.5 font-bold text-slate-300"><Terminal className="w-3.5 h-3.5 text-primary" /> Terminal</span>
            <button
              onClick={runCode}
              disabled={running || activeFile !== 'solution.py'}
              className="bg-primary hover:bg-primary-hover disabled:bg-[#333333] disabled:text-slate-500 text-white px-3 py-1 rounded font-bold flex items-center gap-1 cursor-pointer transition-all text-[10px]"
            >
              {running ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Run Code
            </button>
          </div>
          <div className="flex-1 p-3 overflow-y-auto space-y-1 text-[#85c46c]">
            {terminalOutput.map((line, idx) => (
              <p key={idx} className={line.includes("PASSED") || line.includes("SUCCESS") ? "text-primary" : line.includes("ERROR") ? "text-red-500" : "text-[#d4d4d4]"}>{line}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Docked AI Copilot Sidebar (Right columns - 300px) */}
      <div className="w-72 bg-[#252526] border-l border-[#1e1e1e] flex flex-col justify-between select-none">
        {/* Copilot Header */}
        <div className="p-4 border-b border-[#1e1e1e] flex items-center gap-2 bg-[#2d2d2d]">
          <div className="p-1 rounded bg-primary text-white"><Sparkles className="w-4.5 h-4.5" /></div>
          <span className="text-xs font-bold text-white">TalentAI Copilot</span>
        </div>

        {/* Chat Logs */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
          {chatLog.map((turn, idx) => (
            <div key={idx} className={`space-y-1 ${turn.sender === 'user' ? 'text-right' : 'text-left'}`}>
              <span className="text-[10px] text-slate-400 font-bold block">{turn.sender === 'user' ? 'Candidate' : 'Copilot'}</span>
              <div className={`p-2.5 rounded-xl inline-block text-left leading-normal ${
                turn.sender === 'user'
                  ? 'bg-primary text-white rounded-tr-none'
                  : 'bg-[#37373d] text-slate-300 rounded-tl-none border border-border/5'
              }`}>
                {turn.message}
              </div>
            </div>
          ))}
          {copilotLoading && (
            <p className="text-[10px] text-primary font-bold animate-pulse">Copilot is thinking...</p>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleAskCopilot} className="p-3 border-t border-[#1e1e1e] flex gap-1.5 bg-[#2d2d2d]">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            disabled={copilotLoading}
            placeholder="Ask Copilot for a hint..."
            className="flex-1 px-3 py-2 bg-[#1e1e1e] border border-[#3c3c3c] text-white rounded text-xs focus:outline-none focus:border-primary font-sans"
          />
          <button
            type="submit"
            disabled={copilotLoading || !query.trim()}
            className="bg-primary hover:bg-primary-hover disabled:bg-[#333333] text-white p-2 rounded cursor-pointer transition-all flex items-center justify-center shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
