# Enterprise Multi-Tenant SaaS Platform

Welcome to the **Enterprise Multi-Tenant SaaS Platform**! This is a modern, full-stack microservice-driven Software as a Service application supporting multi-role business operations across **20 Core Verticals**.

---

## 🗺️ Core Services Milestone Roadmap (20 Verticals)

### 🏆 1st Milestone Services (7 Core Verticals — Active & Under Implementation)

| # | Business Vertical | Backend Service | Frontend Module | Admin Dashboard |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 💻 **Technical Services** | `backend/apps/technology` | `frontend/modules/technical` | `admin/.../technicalService` |
| 2 | 🏢 **Real Estate** | `backend/apps/real-estate` | `frontend/modules/real-estate` | `admin/.../real-estate` |
| 3 | ✈️ **Visa & Travel** | `backend/apps/visa-travel` | `frontend/modules/visa` | `admin/.../visa-travel` |
| 4 | 🎓 **Courses & Education** | `backend/apps/education` | `frontend/modules/courses` | `admin/.../courses` |
| 5 | 💼 **Careers & Jobs** | `backend/apps/user-service` | `frontend/modules/jobs` | `admin/.../careers` |
| 6 | 🚗 **Transport & Vehicles** | `backend/apps/commercial-industrial` | `frontend/modules/transport` | `admin/.../transport` |
| 7 | 🛒 **Marketplace** | `backend/apps/order` | `frontend/modules/marketplace` | `admin/.../marketplace` |

---

### 🥈 2nd Milestone Services (7 Core Verticals — Next Phase)

*Detailed service specifications and domain verticals for Milestone 2 will be announced in upcoming release phases.*

---

### 🥉 3rd Milestone Services (6 Core Verticals — Future Expansion)

*Detailed service specifications and domain verticals for Milestone 3 will be announced in upcoming release phases.*

---

## 🏗️ The Synchronous 3-Folder Execution Triad

Every feature and business vertical is engineered in **lockstep across all 3 primary workspace folders** so that every milestone delivers a fully integrated, end-to-end working system:

```
                  ┌─────────────────────────────────────────┐
                  │       3-FOLDER EXECUTION TRIAD          │
                  └────────────────────┬────────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         │                             │                             │
┌────────▼────────┐           ┌────────▼────────┐           ┌────────▼────────┐
│ 🔵 BACKEND APP  │           │ 🟢 FRONTEND APP │           │  🔴 ADMIN APP   │
│ (backend/apps/) │ ◄──────►  │(frontend/mods/) │ ◄──────►  │(admin/src/dash) │
│ NestJS & DB     │           │ User/Business UI│           │ Verification    │
└─────────────────┘           └─────────────────┘           └─────────────────┘
```

| Folder Path | Technology Stack | Role & Purpose |
| :--- | :--- | :--- |
| 🔵 **`backend/apps/`** | NestJS, PostgreSQL (TypeORM), MongoDB, Redis | Scalable microservices, REST APIs, DTO validation, DB entities |
| 🟢 **`frontend/modules/`** | Next.js 14 App Router, TanStack Query, Zustand | Public Marketplace, User Dashboard & Business Partner Portals |
| 🔴 **`admin/src/business/`** | Next.js 14, Tailwind CSS, Recharts | Back-Office Governance, Eye Icon Inspection & Verification Modals |

---

## 👥 Multi-Role Account & Authentication Flow

The platform supports 4 distinct user account roles with automated post-login routing and header profile pills:

| Role | Post-Login Landing Target | Dashboard Route | Header Profile Pill Badge |
| :--- | :--- | :--- | :--- |
| **User (Client / Buyer)** | Landing Page (`/`) | `/user/dashboard` | `User` |
| **Business (Provider / Seller)** | Landing Page (`/`) | `/business/dashboard` | `Business` |
| **Affiliate (Promoter / Agency)** | Landing Page (`/`) | `/affiliate/dashboard` | `Affiliate` |
| **Admin (Back-Office Governance)** | Admin Portal (`/admin/dashboard`) | `/admin/dashboard` | `Admin` |

---

## 📍 1ST MILESTONE: Technical Services Implementation

The **Technical Services** vertical is fully implemented across all 3 workspace folders:

```
┌───────────────────────────┐      ┌───────────────────────────┐      ┌───────────────────────────┐
│     BUSINESS ACCOUNT      │      │       ADMIN ACCOUNT       │      │       USER ACCOUNT        │
│    (Provider / Seller)    │      │    (Back-Office Verifier) │      │     (Client / Buyer)      │
└─────────────┬─────────────┘      └─────────────┬─────────────┘      └─────────────┬─────────────┘
              │                                  │                                  │
   1. Posts Service Wizard                       │                                  │
   (Status: PENDING) ───────────────────────────►│                                  │
                                       2. Eye Icon Verification                     │
                                       (Status: ACTIVE) ───────────────────────────►│
                                                                           3. Browses Live Services
                                                                           & Requests Quote
              ◄─────────────────────────────────────────────────────────────────────┘
   4. Accepts Proposal & Starts Work
```

### 1. 🟢 Business Partner Portal (`frontend/modules/dashboard/business`)
- **4-Step Technical Service Creation Wizard (`/business/technical/create`)**:
  - **Step 1: Basic Information**: Service Title, Technical Category, Short Summary, and Cover/Thumbnail Image URL.
  - **Step 2: Tech Stack & Skill Tag Pills**: Interactive skill tag input + quick presets (*React, Next.js, TypeScript, Node.js, NestJS, Docker, AWS*). Displays theme-styled color pills with `x` close icons to add and remove skills dynamically.
  - **Step 3: Pricing & Scope**: Fixed Price vs Hourly Rate toggle, Budget Amount ($USD), Target Timeline (Days), and Key Deliverables list.
  - **Step 4: Review & Submit**: Service summary preview before submitting to Admin for verification. Once submitted, status is set to `Pending Approval`.

### 2. 🔴 Admin Back-Office (`admin/src/business/dashboard/technicalService`)
- **Technical Services Governance Table**: Displays real business service listings with status filter tabs (*All Services*, *Pending Approval*, *Active / Approved*).
- **Eye Icon (`<Eye />`) Verification Modal**:
  - Admin inspects service details, Tech Stack skill pills, deliverables, and budget.
  - Includes a 1-click **"Approve & Publish Service"** button (`bg-emerald-600`) that updates the status to `ACTIVE` and publishes the service to the live marketplace.

### 3. 🟢 User Marketplace Frontend (`frontend/modules/technical`)
- **Live Service Catalog (`/technical`)**: Dynamically fetches and renders all active (`status: ACTIVE`) services approved by Admin.
- Displays high-impact technical service cards with tech stack tags, delivery timelines, and budget details for clients to browse and request quotes.

### 4. 🔵 NestJS Backend Microservice (`backend/apps/technology`)
- **TypeORM Entities**: `TechnicalService` (`technical_services` table in PostgreSQL) & `TechnicalCategory`.
- **DTO Validation**: `CreateServiceDto` with `class-validator` decorators enforcing title, category, description, and visibility constraints.
- **REST Endpoints**:
  - `GET /api/v1/services` (Public marketplace catalog)
  - `POST /api/v1/services` (Business service submission)
  - `PATCH /api/v1/services/:id/status` (Admin status update)

---

## 🛠️ Complete Technology Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, TanStack Query (React Query), Zustand, Lucide Icons, Sonner.
- **Backend**: NestJS, TypeORM, PostgreSQL, MongoDB, Redis, Swagger API Docs, Class Validator.
- **Admin**: Next.js 14, Recharts, Custom Verification Modals, Dark Mode Theme Engine.

---

## 👨‍💻 Credits & Information
- **Company**: Design Sequence LLC
- **Developer**: Abdul Rafiu (Full MERN / Full-Stack Developer)