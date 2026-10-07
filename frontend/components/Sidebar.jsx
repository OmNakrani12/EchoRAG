'use client';

import React from 'react';
import { 
  Search, 
  Home, 
  Settings, 
  Users, 
  Database, 
  BarChart2, 
  Mic, 
  ShieldCheck, 
  ChevronDown, 
  ChevronRight, 
  ChevronLeft,
  Flame,
  Radio
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const shortcuts = [
    { id: 'dashboard', label: 'Project Overview', icon: Home },
    { id: 'ingestion', label: 'Knowledge Repository', icon: Database },
    { id: 'query', label: 'Voice RAG Console', icon: Mic },
    { id: 'vector', label: 'Qdrant Vector DB', icon: ShieldCheck },
    { id: 'history', label: 'Analytics Dashboard', icon: BarChart2 },
  ];

  return (
    <aside className="w-64 firebase-sidebar min-h-screen flex flex-col shrink-0 text-slate-300">
      {/* Search Input at Top matching screenshot */}
      <div className="p-4 border-b border-[#2c2c2c]">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search for products"
            className="w-full bg-[#242424] text-xs text-slate-200 placeholder-slate-400 rounded-full pl-9 pr-3 py-2 border border-[#333] focus:outline-none focus:border-slate-500"
          />
        </div>
      </div>

      {/* Main Project Nav Items */}
      <div className="p-3 border-b border-[#2c2c2c] space-y-1">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`w-full firebase-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
        >
          <Home className="w-4 h-4" />
          <span className="flex-1 text-left">Project Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('vector')}
          className="w-full firebase-nav-item justify-between"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Project Shortcuts Section matching screenshot */}
      <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
        <div>
          <p className="px-4 text-[11px] font-medium text-slate-400 mb-2">
            Project shortcuts
          </p>
          <div className="space-y-1">
            <button
              onClick={() => setActiveTab('ingestion')}
              className={`w-full firebase-nav-item ${activeTab === 'ingestion' ? 'active' : ''}`}
            >
              <Database className="w-4 h-4" />
              <span>Knowledge Storage</span>
            </button>

            <button
              onClick={() => setActiveTab('query')}
              className={`w-full firebase-nav-item ${activeTab === 'query' ? 'active' : ''}`}
            >
              <Mic className="w-4 h-4" />
              <span>Voice RAG Studio</span>
            </button>

            <button
              onClick={() => setActiveTab('vector')}
              className={`w-full firebase-nav-item ${activeTab === 'vector' ? 'active' : ''}`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Qdrant Vector DB</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`w-full firebase-nav-item ${activeTab === 'history' ? 'active' : ''}`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Analytics Dashboard</span>
            </button>

            <button className="w-full firebase-nav-item text-slate-400">
              <ChevronDown className="w-4 h-4" />
              <span>Show all</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Bottom Product Categories & Pricing Plan matching screenshot */}
      <div className="p-4 border-t border-[#2c2c2c] bg-[#1a1a1a] text-xs">
        <p className="text-[11px] text-slate-400 mb-2">Product categories</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-white">Spark</p>
            <p className="text-[11px] text-slate-400">No-cost ($0/month)</p>
          </div>
          <button className="text-xs font-semibold text-slate-200 hover:text-white underline">
            Upgrade
          </button>
        </div>

        <div className="mt-4 pt-2 border-t border-[#2c2c2c] flex items-center justify-between text-slate-400">
          <ChevronLeft className="w-4 h-4 cursor-pointer hover:text-white" />
          <span className="text-[10px] font-mono">EchoRAG v2.4</span>
        </div>
      </div>
    </aside>
  );
}
