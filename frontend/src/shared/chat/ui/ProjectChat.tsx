"use client";

import React, { useState } from "react";

export function ProjectChat({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState([
    { id: 1, sender: "Business", text: "Hello! We are excited to start working on the design project. Could you share the brand guidelines?", time: "10:00 AM", isMine: false },
    { id: 2, sender: "You", text: "Hi! Yes, I will upload them right now. Give me a moment.", time: "10:05 AM", isMine: true },
    { id: 3, sender: "You", text: "Attached the branding PDF.", file: "brand-guidelines.pdf", time: "10:06 AM", isMine: true },
  ]);

  const [newMessage, setNewMessage] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    setMessages([...messages, {
      id: Date.now(),
      sender: "You",
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMine: true
    }]);
    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-[80vh] bg-[#0A0A0B] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in duration-500">
      
      {/* Chat Header */}
      <div className="px-6 py-4 bg-white/5 border-b border-white/10 backdrop-blur-md flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-lg">
            CB
          </div>
          <div>
            <h3 className="font-bold text-white leading-tight">CreativeTech Ltd</h3>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse"></span>
              <p className="text-xs text-green-400 font-medium">Online</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Project</p>
            <p className="text-sm font-mono text-gray-300">{projectId}</p>
          </div>
          <button className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/5 blur-[100px] pointer-events-none" />
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col max-w-[80%] ${msg.isMine ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
            <span className="text-xs text-gray-500 mb-1 px-1">{msg.sender}</span>
            <div className={`px-5 py-3 rounded-2xl relative group ${
              msg.isMine 
                ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-tr-sm shadow-lg shadow-purple-500/10' 
                : 'bg-white/10 text-gray-200 border border-white/5 rounded-tl-sm'
            }`}>
              {msg.text && <p className="leading-relaxed text-sm md:text-base">{msg.text}</p>}
              
              {/* File Attachment Simulation */}
              {msg.file && (
                <div className={`mt-2 flex items-center gap-3 p-3 rounded-xl border ${msg.isMine ? 'bg-black/20 border-white/10' : 'bg-white/5 border-white/10'}`}>
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{msg.file}</p>
                    <p className="text-xs opacity-70">2.4 MB</p>
                  </div>
                  <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </button>
                </div>
              )}
            </div>
            <span className="text-[10px] text-gray-500 mt-1 px-1">{msg.time}</span>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/5 border-t border-white/10 backdrop-blur-md z-10">
        <form onSubmit={handleSend} className="flex items-center gap-3">
          <button type="button" className="p-3 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
          </button>
          
          <input 
            type="text" 
            placeholder="Type your message..."
            className="flex-1 bg-[#131315] border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />

          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="p-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl transition-all shadow-lg shadow-purple-500/25 active:scale-[0.95] disabled:opacity-50 disabled:active:scale-100"
          >
            <svg className="w-5 h-5 translate-x-[1px] -translate-y-[1px]" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
          </button>
        </form>
      </div>

    </div>
  );
}
