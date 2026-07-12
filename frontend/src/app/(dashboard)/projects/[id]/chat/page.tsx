"use client";

import React, { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProjects } from "@/core/projects/context/ProjectContext";
import Link from "next/link";
import { useAuth } from "@/core/auth/context/AuthContext";

export default function ProjectChatPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;
  
  const { getProjectById, sendMessage } = useProjects();
  const { user } = useAuth();
  const project = getProjectById(projectId);

  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [project?.messages]);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Project Not Found</h2>
        <p className="text-slate-500 mb-6">The project chat you are looking for does not exist.</p>
        <Link href="/projects" className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium">Back to My Projects</Link>
      </div>
    );
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    sendMessage(projectId, {
      senderId: user?.email || "client-1",
      senderName: user?.email ? user.email.split('@')[0] : "You",
      senderRole: "client",
      text: messageText,
    });
    setMessageText("");
  };

  const handleFileUpload = () => {
    sendMessage(projectId, {
      senderId: user?.email || "client-1",
      senderName: user?.email ? user.email.split('@')[0] : "You",
      senderRole: "client",
      text: "Uploaded a new document: requirements_v2.pdf",
      isFile: true,
      fileUrl: "#",
    });
  };

  const handleMeetingRequest = () => {
    sendMessage(projectId, {
      senderId: user?.email || "client-1",
      senderName: user?.email ? user.email.split('@')[0] : "You",
      senderRole: "client",
      text: "Requested a Zoom Meeting for tomorrow at 10:00 AM.",
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-500">
      
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${project.id}`} className="p-2 -ml-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </Link>
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              {project.title}
              <span className="text-xs font-mono bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md">{project.id}</span>
            </h2>
            <p className="text-sm text-slate-500">
              Chatting with <strong className="text-slate-700 font-medium">{project.businessName || "No one yet"}</strong>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleMeetingRequest} className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 shadow-sm">
            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            Request Meeting
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar">
        {project.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
            <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <p>No messages yet. Send a message to start the conversation.</p>
          </div>
        ) : (
          project.messages.map((msg) => {
            if (msg.senderRole === "system") {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="px-3 py-1 bg-slate-200/50 text-slate-500 text-xs font-medium rounded-full border border-slate-200">
                    {msg.text}
                  </span>
                </div>
              );
            }

            const isMe = msg.senderRole === "client";

            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-end gap-2 max-w-[80%]">
                  {!isMe && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                      {msg.senderName.charAt(0)}
                    </div>
                  )}
                  
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-xs text-slate-400 mb-1 px-1">{msg.senderName}</span>
                    <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                      isMe 
                        ? 'bg-blue-600 text-white rounded-br-sm' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                    }`}>
                      {msg.isFile ? (
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-slate-100'}`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          </div>
                          <div>
                            <p className="font-medium text-sm underline decoration-white/50 underline-offset-2">{msg.text.replace("Uploaded a new document: ", "")}</p>
                            <p className={`text-xs ${isMe ? 'text-blue-200' : 'text-slate-500'}`}>PDF Document • 2.4 MB</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 bg-white shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={handleFileUpload}
            className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors shrink-0"
            title="Upload File"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
          </button>
          
          <input
            type="text"
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 text-slate-900 outline-none placeholder-slate-400"
            placeholder="Type your message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
          />
          
          <button 
            type="submit"
            disabled={!messageText.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-medium rounded-xl transition-colors shadow-md shadow-blue-500/20 active:scale-[0.98] shrink-0"
          >
            Send
          </button>
        </form>
      </div>

    </div>
  );
}
