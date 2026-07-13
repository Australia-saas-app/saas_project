# SaaS Project Platform

Welcome to the SaaS Project Platform! This is a modern, full-stack Software as a Service application.

## 🚀 Project Overview
This platform is designed to provide a comprehensive suite of services including **Visa & Travel**, **Courses**, **Careers**, **Transport**, **Marketplace**, and **Real Estate** management. It is built with a highly scalable architecture and features a fast, responsive user interface.

## 🏗️ Architecture Structure
The project is divided into three core environments:
- **`frontend/`**: The public-facing client application, providing a beautiful and dynamic user experience.
- **`admin/`**: The secure admin dashboard built with Next.js and TailwindCSS, managing everything from user monitoring to payment tracking.
- **`backend/`**: The robust API and database layer serving the core business logic.

## 🛠️ Technology Stack
- **Frontend Framework**: Next.js 16.2 (React 18)
- **Backend Framework**: NestJS (TypeScript)
- **Database & ORM**: PostgreSQL with TypeORM
- **Styling**: Tailwind CSS & custom dark mode themes
- **UI Components**: shadcn/ui, Radix UI, vaul
- **State Management**: Redux Toolkit & Zustand
- **Data Fetching**: React Query (@tanstack/react-query)
- **Forms & Validation**: React Hook Form, Zod, class-validator, class-transformer
- **Notifications**: Sonner (Toast notifications)
- **Architecture**: Micro-frontend/monorepo style layout via Docker Compose


## 📝 Registration & Authentication
- **Account Creation & Registration**: Fully functional frontend registration flows for Users, Businesses, and Affiliates, connected directly to the backend API.
- **Authentication & Security**: Fully implemented JWT (JSON Web Tokens) Session management. Backend routes are securely protected with `AuthGuard`.
- **Validation Layer**: Integrated `class-validator` and `class-transformer` DTOs to guarantee data integrity across all incoming API payloads.
- **Data Integrity**: Implemented TypeORM Soft Deletes across user entities to ensure historical data preservation and secure auditing when an admin deletes a user.
- **Account Approval Workflow**: 
  - All new user, business, and affiliate registrations default to a **`PENDING`** state.
  - Admins have an intuitive "Quick Approve / Block" action modal for new registrations.
  - The admin tables use dynamic, color-coded badges to easily identify account statuses (`PENDING`, `ACTIVE`, `DORMANT`, `BLOCK`, `SUSPEND`, `CLOSED`).
- **Global Toast Notifications**: Integrated `sonner` for real-time success and error toast notifications across both the Frontend and Admin dashboards (e.g., login success, status updates, deletions).

*This repository is actively maintained and currently under active development.*
---

## 👨‍💻 Credits & Information
- **Company**: Design Sequence LLC
- **Developer**: Abdul Rafiu (Full MERN Stack Developer)