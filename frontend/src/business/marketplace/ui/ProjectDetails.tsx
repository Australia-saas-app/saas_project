"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useProjects } from "@/core/projects/context/ProjectContext";
import Link from "next/link";

export function ProjectDetails({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { getProjectById, updateProjectStatus, releaseEscrow, fileDispute } = useProjects();
  
  const project = getProjectById(projectId);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Project Not Found</h2>
        <p className="text-slate-500 mb-6">The project you are looking for does not exist.</p>
        <Link href="/projects" className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium">Back to My Projects</Link>
      </div>
    );
  }

  const isAssigned = !!project.businessId;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2 py-1 rounded-md border border-purple-100">{project.id}</span>
            <span className={`text-xs font-medium px-2 py-1 rounded-md border ${
              project.status === "In Progress" ? "bg-blue-50 text-blue-700 border-blue-100" : 
              project.status === "Completed" ? "bg-green-50 text-green-700 border-green-100" :
              "bg-yellow-50 text-yellow-700 border-yellow-100"
            }`}>
              {project.status}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{project.title}</h1>
          <p className="text-slate-500 mt-1">Category: {project.category} • Created {project.createdAt}</p>
        </div>
        
        <div className="flex items-center gap-3">
          {isAssigned ? (
            <Link 
              href={`/projects/${project.id}/chat`}
              className="px-6 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium rounded-xl transition-colors border border-purple-200 flex items-center gap-2 shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              Open Project Chat
            </Link>
          ) : (
            <Link 
              href="/discover"
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] flex items-center gap-2"
            >
              Find a Business
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Requirements & Description</h2>
            <div className="prose prose-slate max-w-none text-slate-600 whitespace-pre-wrap">
              {project.requirements}
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Milestones & Progress</h2>
            {isAssigned ? (
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center border border-green-200 shrink-0">
                      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div className="w-0.5 h-full bg-green-200 my-1"></div>
                  </div>
                  <div className="pb-6">
                    <h4 className="text-lg font-semibold text-slate-900">Project Started</h4>
                    <p className="text-slate-500">Business accepted the project and escrow is funded.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200 shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    </div>
                    <div className="w-0.5 h-full bg-slate-200 my-1"></div>
                  </div>
                  <div className="pb-6">
                    <h4 className="text-lg font-semibold text-slate-900">First Draft / Milestone 1</h4>
                    <p className="text-slate-500">Awaiting submission from {project.businessName}.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                      {project.status === "Completed" && <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900">Final Delivery</h4>
                    <p className="text-slate-500 mb-3">Review and approve final deliverables.</p>
                    {project.status === "In Progress" && (
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            if (window.confirm("Are you sure you want to approve the milestone and release escrow funds to the business?")) {
                              releaseEscrow(project.id);
                              alert("Escrow Released! Project is completed.");
                            }
                          }}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                        >
                          Approve & Release Escrow
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Are you sure you want to file a dispute? This will freeze the escrow funds.")) {
                              fileDispute(project.id);
                              alert("Dispute filed. Admin will review your case shortly.");
                            }
                          }}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-medium rounded-lg transition-colors border border-red-200 shadow-sm"
                        >
                          File Dispute
                        </button>
                      </div>
                    )}
                    {project.status === "Completed" && (
                      <div className="flex items-center gap-3 mt-2">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                          Completed & Paid
                        </span>
                        <button 
                          onClick={() => {
                            alert("Thank you! Your review for this business has been published.");
                          }}
                          className="px-4 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 text-sm font-medium rounded-lg transition-colors border border-yellow-200 shadow-sm flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                          Leave Review
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500">Hire a business to track project milestones here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Project Overview</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Budget</p>
                <p className="text-2xl font-bold text-slate-900">${project.budget.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Deadline</p>
                <p className="text-lg font-medium text-slate-900">{project.deadline}</p>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-500 mb-2">Assigned Business</p>
                {isAssigned ? (
                  <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white shrink-0">
                      {project.businessName?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{project.businessName}</p>
                      <p className="text-xs text-slate-500">ID: {project.businessId}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-900 font-medium">None</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Escrow Protection Active</h3>
            <p className="text-sm text-blue-600">Your funds will be held securely in escrow until you explicitly approve the final milestones.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
