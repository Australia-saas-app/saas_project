"use client";

import React from "react";
import Link from "next/link";
import { useProjects } from "@/core/projects/context/ProjectContext";

import { useRouter } from "next/navigation";

export function ProjectDashboard() {
  const { projects } = useProjects();
  const router = useRouter();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">My Projects</h2>
          <p className="text-slate-600">Track and manage your posted projects and milestones.</p>
        </div>
        <Link 
          href="/projects/new"
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Post New Project
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {projects.map((project) => (
          <div 
            key={project.id} 
            onClick={() => router.push(`/projects/${project.id}`)}
            className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-md shadow-sm transition-all group cursor-pointer"
          >
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2 py-1 rounded-md border border-purple-100">{project.id}</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-md border ${
                    project.status === "In Progress" ? "bg-blue-50 text-blue-700 border-blue-100" : 
                    project.status === "Completed" ? "bg-green-50 text-green-700 border-green-100" :
                    project.status === "Disputed" ? "bg-red-50 text-red-700 border-red-100" :
                    "bg-yellow-50 text-yellow-700 border-yellow-100"
                  }`}>
                    {project.status}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{project.title}</h3>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    {project.businessName || "No Business Assigned"}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {project.deadline}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-slate-500 font-medium">Budget</p>
                  <p className="text-2xl font-bold text-slate-900">${project.budget}</p>
                </div>
                
                <Link 
                  href={`/projects/${project.id}/chat`}
                  onClick={(e) => e.stopPropagation()}
                  className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm font-medium rounded-lg transition-colors border border-purple-200"
                >
                  Open Chat
                </Link>

                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors border border-slate-100 group-hover:border-blue-100">
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
