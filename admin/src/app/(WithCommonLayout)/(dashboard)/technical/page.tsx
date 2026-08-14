"use client";

import React, { useState } from "react";
import AdminTechnicalProjectsManager from "@/src/business/dashboard/technicalService/components/AdminTechnicalProjectsManager";
import TechnicalProjectLayout from "@/src/business/dashboard/shared/components/TechnicalProjectLayout";
import { Briefcase, Layers } from "lucide-react";

export default function AdminTechnicalPage() {
  const [view, setView] = useState<"projects" | "legacy-table">("projects");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-gray-200 px-6 pt-4">
        <button
          onClick={() => setView("projects")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
            view === "projects"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Briefcase className="h-4 w-4" />
          Technical Projects Pipeline &amp; Quotes
        </button>
        <button
          onClick={() => setView("legacy-table")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
            view === "legacy-table"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Layers className="h-4 w-4" />
          Task Assignment &amp; Penalty Logs
        </button>
      </div>

      {view === "projects" ? (
        <AdminTechnicalProjectsManager />
      ) : (
        <div className="p-6">
          <TechnicalProjectLayout />
        </div>
      )}
    </div>
  );
}