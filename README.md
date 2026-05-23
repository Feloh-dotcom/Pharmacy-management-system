# Pharmacy Management System

A highly polished, high-fidelity, production-ready Full-Stack Pharmacy Management Platform designed with modern visual aesthetics, rigorous medical inventory controls, dual-language support (English and Swahili), security audit logging, point-of-sale checkout systems, and real-time ledger accounting.

---

## 🏗️ Architecture Overview

The system is built as a highly responsive **Full-Stack Application** designed with performance, secure isolation of business logic, and user-experience precision:

- **Frontend:** React 18+ powered by Vite, utilizing [Tailwind CSS](https://tailwindcss.com/) for display styling, and [lucide-react](https://lucide-react.dev/) for precise vector iconography. Micro-interactions and transition states are reinforced using `motion` animations.
- **Backend:** A lightning-fast Express server in TypeScript (`server.ts`) operating behind an Nginx reverse-proxy on port `3000`.
- **Database & Persistence:** Real-time persistence using a local database model centered around `data_store.json` as read/written through modular transactions inside structural backend routines.

---

## 📂 Project Structure & Document Directory

Below is the directory structure mapping every file in this system and explaining precisely what segment of the application is managed by each asset:

```text
├── .env.example              # Config template documenting necessary secret variables (such as database IDs or API keys)
├── .gitignore                # Specifies ignored build artifacts, local caches, and node dependencies to keep the workspace clean
├── data_store.json           # File-based database holding persistent tables for medicines, sales, orders, users, audit logs, and more
├── index.html                # Main single-page document shell that bootstraps the client application
├── metadata.json             # Applet descriptor controlling the app title, description, and iframe window level permissions
├── package.json              # System package manifest configuring dependencies, compilation scripts, and product runners
├── package-lock.json         # Pinned lockfile enforcing deterministic dependency resolutions during installation
├── server.ts                 # Full-stack backend entrypoint managing secure REST API routes, auth systems, transactions, and Vite middleware
├── server_db.ts              # Abstract helper library for reading, initializing, and writing to the file-based persistent database
├── tsconfig.json             # TypeScript configuration defining rigorous compiler strictness, path mappings, and type-checks
├── vite.config.ts            # Vite compile settings establishing assets building, Tailwind, and dev server proxy routing
└── src/                      # Client-side React source directory
    ├── App.tsx               # Primary Client application controller coordinating active views, sidebar layouts, and auth states
    ├── index.css             # Entry stylesheet loaded with Tailwind directive imports and custom display typography configurations
    ├── main.tsx              # Boots the React tree, rendering the main `<App />` root strictly inside React's StrictMode wrapper
    ├── types.ts              # Holds unified global TypeScript interfaces, enums, structures, and schemas shared between layers
    ├── utils.ts              # General client-side helper functions (such as numeric formatting, search matching, and date operations)
    │
    ├── assets/               # Visual client assets
    │   └── images/           # Contains high-resolution compressed image assets used for splash banners and interface styling
    │
    └── components/           # Self-contained modular React components managing distinct functional domains
        ├── AICopilot.tsx     # Provides cognitive support, supply recommendations, and forecasting queries powered by AI heuristic models
        ├── Auth.tsx          # Responsive landing card overlay for user authentication, registration levels, and Swahili-English localization
        ├── Categories.tsx    # Manages medicinal classification schemas (such as antibiotics, therapeutics, or legal drug schedules)
        ├── Customers.tsx     # Registry for patients, customer profiles, medical allergy notes, contact histories, and loyalty points
        ├── Dashboard.tsx     # Operational home view detailing active metrics, revenue counts, low stock alerts, and quick action nodes
        ├── Finance.tsx       # Real-time ledger audit managing business expense utilities, sales incomes, balance charts, and invoices
        ├── Header.tsx        # Styled top navigation bar rendering real-time user profiles, fast role selection, and search queries
        ├── Medicines.tsx     # Master inventory register facilitating drug stock counts, dosage configurations, search filters, and edits
        ├── Orders.tsx        # Procurement tracker for initiating, auditing, and processing wholesale purchase orders from partner suppliers
        ├── POS.tsx           # Cashier checkout terminal supporting smart item lookups, receipt generation, tax calculations, and pay gates
        ├── Reports.tsx       # Aggregated utility charts and PDF-ready summary sheets tracking profit performance & operational metrics
        ├── Settings.tsx      # System configuration page controlling security policies, enterprise data resets, and system states
        ├── Sidebar.tsx       # Left-side navigation tray organizing primary application views, navigation categories, and active tabs
        └── Suppliers.tsx     # Complete logistics registry organizing medical laboratories, contact reps, and wholesale active vendors
```

---

## 💡 Highlighted Functional Controls

### 🔐 Workstation Access Control (`src/components/Auth.tsx`)
This controls the entry gate to the system. It features:
- **Language Capsule Switch:** Toggle from English to Swahili instantly with persistent language context.
- **Access Node Form Controls:** A dark, high-contrast workstation form stripped of unnecessary diagnostic clutter or demo text as requested.
- **Role-Based Routing:** User credentials route them seamlessly to standard administrator, pharmacist, or store manager roles.

### 📝 Main App Shell Routing (`src/App.tsx`)
Coordinates user authentication state. Once a user successfully registers or authenticates their session, this router switches the view context from the `Auth` landing screen to the main workstation cockpit, which is surrounded by the navigation `Sidebar`, global `Header`, and interactive domain panels.

### 💾 Real-time Backend Engine (`server.ts` & `server_db.ts`)
The Express server acts as the secure central nervous system of the Pharmacy Management system. Any item checked out via the cash register (`POS.tsx`), restocked via the master database register (`Medicines.tsx`), or updated via supplier orders (`Orders.tsx`) performs immediate, transactional database queries on the server to keep `data_store.json` highly secure and up to date with zero data slips.
