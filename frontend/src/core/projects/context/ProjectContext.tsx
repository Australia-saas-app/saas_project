"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type ProjectStatus = "In Progress" | "Completed" | "Pending Approval" | "Disputed" | "Open for Bids";

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "client" | "business" | "system";
  text: string;
  timestamp: string;
  isFile?: boolean;
  fileUrl?: string;
}

export interface Project {
  id: string;
  title: string;
  category: string;
  budget: number;
  deadline: string;
  requirements: string;
  status: ProjectStatus;
  businessId?: string;
  businessName?: string;
  createdAt: string;
  messages: Message[];
}

interface ProjectContextType {
  projects: Project[];
  addProject: (project: Omit<Project, "id" | "status" | "createdAt" | "messages">) => string;
  updateProjectStatus: (id: string, status: ProjectStatus) => void;
  assignBusiness: (id: string, businessId: string, businessName: string) => void;
  getProjectById: (id: string) => Project | undefined;
  sendMessage: (projectId: string, message: Omit<Message, "id" | "timestamp">) => void;
  walletBalance: number;
  totalEscrow: number;
  depositFunds: (amount: number) => void;
  releaseEscrow: (projectId: string) => void;
  fileDispute: (projectId: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Initial Mock Data
const MOCK_PROJECTS: Project[] = [
  {
    id: "PRJ-1029",
    title: "Website Design",
    category: "Design",
    budget: 100,
    status: "In Progress",
    businessName: "CreativeTech Ltd",
    businessId: "BUS-01",
    deadline: "2026-08-15",
    requirements: "Need a beautiful website design using React and TailwindCSS.",
    createdAt: "2026-07-01",
    messages: [
      {
        id: "MSG-1",
        senderId: "system",
        senderName: "System",
        senderRole: "system",
        text: "Project started and CreativeTech Ltd was hired.",
        timestamp: "2026-07-01T10:00:00Z"
      },
      {
        id: "MSG-2",
        senderId: "BUS-01",
        senderName: "CreativeTech Ltd",
        senderRole: "business",
        text: "Hi there! I've reviewed the requirements and I'm ready to begin. Can you share the brand assets?",
        timestamp: "2026-07-01T10:05:00Z"
      }
    ]
  },
  {
    id: "PRJ-1028",
    title: "Mobile App Development",
    category: "Engineering",
    budget: 5000,
    status: "Completed",
    businessName: "AppDev Pros",
    businessId: "BUS-02",
    deadline: "2026-06-01",
    requirements: "Full-stack mobile application in React Native.",
    createdAt: "2026-05-01",
    messages: []
  }
];

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [walletBalance, setWalletBalance] = useState<number>(1250.00);

  const addProject = (newProjectData: Omit<Project, "id" | "status" | "createdAt" | "messages">) => {
    const id = `PRJ-${Math.floor(1000 + Math.random() * 9000)}`;
    const newProject: Project = {
      ...newProjectData,
      id,
      status: "Open for Bids",
      createdAt: new Date().toISOString().split("T")[0],
      messages: []
    };
    setProjects((prev) => [newProject, ...prev]);
    return id;
  };

  const updateProjectStatus = (id: string, status: ProjectStatus) => {
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
  };

  const assignBusiness = (id: string, businessId: string, businessName: string) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id === id) {
        // Lock funds in escrow
        if (walletBalance < p.budget) {
          alert("Insufficient funds in wallet to cover the project budget. Please add funds.");
          return p;
        }
        setWalletBalance((b) => b - p.budget);

        const systemMessage: Message = {
          id: `MSG-${Date.now()}`,
          senderId: "system",
          senderName: "System",
          senderRole: "system",
          text: `Project started. ${businessName} was hired and $${p.budget} was locked in Escrow.`,
          timestamp: new Date().toISOString()
        };
        return { ...p, businessId, businessName, status: "In Progress", messages: [...p.messages, systemMessage] };
      }
      return p;
    }));
  };

  const releaseEscrow = (id: string) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id === id) {
        const systemMessage: Message = {
          id: `MSG-${Date.now()}`,
          senderId: "system",
          senderName: "System",
          senderRole: "system",
          text: `Milestone approved. $${p.budget} Escrow released to ${p.businessName}. Project is now Completed.`,
          timestamp: new Date().toISOString()
        };
        return { ...p, status: "Completed", messages: [...p.messages, systemMessage] };
      }
      return p;
    }));
  };

  const fileDispute = (id: string) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id === id) {
        const systemMessage: Message = {
          id: `MSG-${Date.now()}`,
          senderId: "system",
          senderName: "System",
          senderRole: "system",
          text: `A dispute has been filed. Project is paused and Escrow funds are frozen pending admin review.`,
          timestamp: new Date().toISOString()
        };
        return { ...p, status: "Disputed", messages: [...p.messages, systemMessage] };
      }
      return p;
    }));
  };

  const getProjectById = (id: string) => {
    return projects.find((p) => p.id === id);
  };

  const sendMessage = (projectId: string, messageData: Omit<Message, "id" | "timestamp">) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id === projectId) {
        const newMessage: Message = {
          ...messageData,
          id: `MSG-${Date.now()}`,
          timestamp: new Date().toISOString()
        };
        return { ...p, messages: [...p.messages, newMessage] };
      }
      return p;
    }));
  };

  const depositFunds = (amount: number) => {
    setWalletBalance((prev) => prev + amount);
  };

  // Compute total Escrow based on In Progress projects
  const totalEscrow = projects.reduce((sum, p) => p.status === "In Progress" ? sum + p.budget : sum, 0);

  return (
    <ProjectContext.Provider value={{ 
      projects, 
      addProject, 
      updateProjectStatus, 
      assignBusiness, 
      getProjectById, 
      sendMessage,
      walletBalance,
      totalEscrow,
      depositFunds,
      releaseEscrow,
      fileDispute
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProjects must be used within a ProjectProvider");
  }
  return context;
}
