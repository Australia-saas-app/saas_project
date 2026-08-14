"use client";

import React, { useState } from "react";
import BusinessProjectsPage from "@/src/modules/technical/components/BusinessProjectsPage";
import TechnicalProjectLayout from "@/src/modules/dashboard/shared/components/TechnicalProjectLayout";
import { Button } from "@/src/components/ui/button";
import { Briefcase, Layers } from "lucide-react";

export default function BusinessTechnicalPage() {
  const [view, setView] = useState<"pipeline" | "team-board">("pipeline");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Button
          size="sm"
          variant={view === "pipeline" ? "default" : "outline"}
          onClick={() => setView("pipeline")}
          className={view === "pipeline" ? "bg-primary text-white" : ""}
        >
          <Briefcase className="mr-1.5 h-4 w-4" />
          Technical Client Projects
        </Button>
        <Button
          size="sm"
          variant={view === "team-board" ? "default" : "outline"}
          onClick={() => setView("team-board")}
          className={view === "team-board" ? "bg-primary text-white" : ""}
        >
          <Layers className="mr-1.5 h-4 w-4" />
          Team Assignments &amp; Penalties
        </Button>
      </div>

      {view === "pipeline" ? <BusinessProjectsPage /> : <TechnicalProjectLayout />}
    </div>
  );
}