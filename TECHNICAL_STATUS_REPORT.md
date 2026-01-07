# Mizan Enterprise - Technical Status Report
**Prepared for: Stellar Blockchain Integration Consultant**  
**Date:** Generated Report  
**Application Version:** v2.0 Alpha

---

## 1. Tech Stack

### Core Platform
- **Desktop Framework:** Electron v29.0.0
- **Package Manager:** npm (Node.js)

### Backend/Server
- **Runtime:** Node.js
- **Web Framework:** Express v5.2.1
- **Database:** SQLite3 v5.1.7 (Database file: `mizan.db`)
- **PDF Generation:** PDFKit v0.17.2 (Server-side), jsPDF v4.0.0 (Client-side)
- **Additional Backend Libraries:**
  - `cors` v2.8.5 (Cross-Origin Resource Sharing)
  - Note: README mentions Python backend, but current implementation uses Node.js/Express

### Frontend
- **Framework:** React v19.2.0
- **Build Tool:** Vite v7.2.4
- **UI Styling:** Tailwind CSS v3.4.17
- **Icons:** Lucide React v0.562.0
- **Data Visualization:** Recharts v3.6.0
- **PDF Generation (Client-side):** jsPDF v4.0.0, jsPDF-AutoTable v5.0.7

### Development Tools
- **Build System:** Electron Builder v24.13.3
- **Development Utilities:**
  - `concurrently` v9.2.1 (Run multiple processes)
  - `wait-on` v9.0.3 (Wait for services)
  - ESLint v9.39.1 (Code linting)
  - PostCSS v8.5.6, Autoprefixer v10.4.23

---

## 2. Project Structure

```
Mizan-Desktop/
├── main.js                    # Electron main process entry point
├── preload.js                 # Electron preload script (IPC bridge)
├── server.js                  # Express backend server (Port 8000)
├── package.json               # Root package dependencies
├── mizan.db                   # SQLite database file
│
├── frontend/                  # React application
│   ├── src/
│   │   ├── App.jsx           # Main React component (Navigation & Layout)
│   │   ├── main.jsx          # React entry point
│   │   ├── config.js         # API base URL configuration
│   │   │
│   │   ├── components/       # React components
│   │   │   └── MurabahaCalculator.jsx
│   │   │
│   │   ├── pages/            # Page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Clients.jsx
│   │   │   └── BlockchainAudit.jsx
│   │   │
│   │   └── utils/            # Utility functions
│   │       └── pdfGenerator.js
│   │
│   ├── package.json          # Frontend dependencies
│   └── vite.config.js        # Vite build configuration
│
├── dist/                     # Build output directory
│   └── win-unpacked/         # Windows executable build
│
└── public/                   # Static assets
    └── logo.png
```

### Key Locations
- **Financial Logic/Backend:** `server.js` (Node.js/Express)
  - Murabaha calculation logic: Lines 59-129
  - Database operations: SQLite3 queries
  - API endpoints: RESTful routes on port 8000

- **Frontend/UI:** `frontend/src/`
  - Main App: `frontend/src/App.jsx`
  - Pages: `frontend/src/pages/`
  - Components: `frontend/src/components/`

- **Database:** `mizan.db` (SQLite3)
  - Initialized by `server.js` on startup
  - Schema defined in `initTables()` function

---

## 3. Current Features & Progress

### ✅ Implemented Features

#### A. **Client Management**
- Create new clients (name, email, credit_score)
- List all clients
- Search/filter clients
- Client credit scoring system
- Client status tracking (Active/Pending)
- UI Location: `frontend/src/pages/Clients.jsx`

#### B. **Murabaha Financing Engine**
- **Calculation Engine:**
  - Asset price input
  - Annual profit rate configuration
  - Duration (months) selection
  - Down payment percentage
  - Security deposit (Hamish Jiddiyyah)
  - Full amortization schedule generation
- **Workflow Management:**
  - 4-step AAOIFI Sharia-compliant workflow:
    1. Draft & Calculate
    2. Promise to Purchase (Wa'd)
    3. Asset Acquisition (Bank Ownership)
    4. Murabaha Sale Contract Signing
- **Status Tracking:** Contract status progression
- **UI Location:** `frontend/src/components/MurabahaCalculator.jsx`
- **Backend Logic:** `server.js` (POST `/api/calculate`)

#### C. **PDF Document Generation**
- **Server-side PDFs:**
  - Official Murabaha Contract (via PDFKit)
  - Includes watermark, financial breakdown, payment schedule
  - Endpoint: POST `/api/generate-contract`
- **Client-side PDFs:**
  - Promise to Purchase (Wa'd) document
  - Murabaha Contract document (via jsPDF)
  - Utility: `frontend/src/utils/pdfGenerator.js`

#### D. **Dashboard & Analytics**
- Real-time KPI display:
  - Total Active Assets
  - Active Clients count
  - System health status
- Data visualization:
  - Portfolio growth area chart (Mock data currently)
  - Contract type distribution pie chart
- UI Location: `frontend/src/pages/Dashboard.jsx`

#### E. **Blockchain Audit Page** (Placeholder)
- UI for immutable ledger audit display
- Mock blockchain transaction feed
- Network status indicators
- **Status:** UI implemented, backend integration pending
- UI Location: `frontend/src/pages/BlockchainAudit.jsx`

### ⚠️ **Known Limitations / Missing Features**

1. **Incomplete API Endpoints:**
   - Frontend expects but backend missing:
     - `GET /api/clients` (Currently not implemented)
     - `POST /api/clients` (Currently not implemented)
     - `GET /api/contracts` (Currently not implemented)
     - `POST /api/contracts` (Currently not implemented)
     - `POST /api/update_status` (Currently not implemented)
   - **Impact:** Client and Contract management features may not function without these endpoints

2. **Database Schema Limitations:**
   - Contracts table lacks fields for:
     - Status tracking (DRAFT, PROMISE, ASSET_OWNED, SALE_SIGNED)
     - Schedule JSON storage
     - Relationship to clients (only stores client_name as TEXT)
     - Financial details (asset_price, profit_rate, etc.)

3. **Blockchain Integration:**
   - Blockchain Audit page displays mock data only
   - No actual blockchain connectivity
   - No transaction recording/hashing

---

## 4. Data Models (Database Schemas)

### **Database:** SQLite3 (`mizan.db`)

#### **Table: `audit_logs`**
```sql
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_action TEXT NOT NULL,
    details TEXT,
    ip_hash TEXT
)
```
**Purpose:** System audit trail (currently not actively used)

#### **Table: `clients`**
```sql
CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    credit_score INTEGER DEFAULT 0
)
```
**Fields:**
- `id`: Primary key
- `name`: Client/Company name
- `email`: Contact email (optional)
- `credit_score`: Credit rating (default: 0)

**Note:** Frontend expects additional fields not in schema:
- `total_debt`: Referenced in Clients.jsx but not in DB schema
- `status`: Referenced in Dashboard.jsx but not in DB schema

#### **Table: `contracts`**
```sql
CREATE TABLE contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT,
    asset_name TEXT,
    total_amount REAL,
    contract_date TEXT
)
```
**Fields:**
- `id`: Primary key
- `client_name`: Client identifier (TEXT, not foreign key)
- `asset_name`: Asset description
- `total_amount`: Total contract value
- `contract_date`: Date string

**Note:** Schema is minimal. Frontend/workflow expects additional fields:
- `status` (DRAFT, PROMISE, ASSET_OWNED, SALE_SIGNED)
- `asset_price`, `financed_amount`, `total_profit`
- `down_payment`, `security_deposit`
- `duration_months`, `annual_profit_rate`
- `schedule_json` (JSON string of payment schedule)
- Proper `client_id` foreign key relationship

---

## 5. Architecture

### **Communication Flow**

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                    │
│                      (main.js)                              │
│  - Manages BrowserWindow                                    │
│  - Starts Python backend (if exists) OR Node.js server      │
│  - Handles app lifecycle                                    │
└──────────────┬──────────────────────────────────────────────┘
               │
               ├─────────────────────────────────────────┐
               │                                         │
               ▼                                         ▼
┌─────────────────────────────┐          ┌──────────────────────────────┐
│   React Frontend            │          │   Express Backend            │
│   (Port 5173 - Dev)         │          │   (Port 8000)                │
│                             │          │                              │
│  - React Components         │──────────│  - REST API Endpoints        │
│  - State Management         │  HTTP    │  - Business Logic            │
│  - UI Rendering             │  REST    │  - Database Operations       │
│  - PDF Generation (client)  │          │  - PDF Generation (server)   │
└─────────────────────────────┘          └──────────────┬───────────────┘
                                                        │
                                                        ▼
                                            ┌───────────────────────┐
                                            │   SQLite Database     │
                                            │   (mizan.db)          │
                                            │                       │
                                            │  - clients            │
                                            │  - contracts          │
                                            │  - audit_logs         │
                                            └───────────────────────┘
```

### **Frontend ↔ Backend Communication**

**Protocol:** HTTP REST API  
**Base URL:** `http://127.0.0.1:8000` (configured in `frontend/src/config.js`)

**Current Implemented Endpoints:**
- `GET /` - Health check
- `POST /api/calculate` - Murabaha calculation
- `GET /api/dashboard` - Dashboard KPI data (mock)
- `POST /api/generate-contract` - Generate PDF contract

**Missing Endpoints (Referenced by Frontend):**
- `GET /api/clients` - List all clients
- `POST /api/clients` - Create new client
- `GET /api/contracts` - List all contracts
- `POST /api/contracts` - Create/save contract
- `POST /api/update_status` - Update contract status

### **Electron IPC (Inter-Process Communication)**
- **Preload Script:** `preload.js`
  - Exposes `electronAPI` to renderer process
  - Currently minimal implementation (message passing setup)
  - Not actively used in current architecture

**Context Isolation:** Enabled (`contextIsolation: true`)  
**Node Integration:** Disabled (`nodeIntegration: false`) for security

### **Development vs Production**

**Development Mode:**
- Frontend: Vite dev server on `http://localhost:5173`
- Backend: Node.js server on `http://127.0.0.1:8000`
- Electron loads frontend from Vite dev server
- DevTools enabled

**Production Mode:**
- Frontend: Static build in `frontend/dist/`
- Backend: Node.js server (embedded) OR Python executable (`backend/api.exe`)
- Electron loads frontend from `file://` protocol
- No DevTools

**Build Command:** `npm run build:win` (creates Windows installer)

---

## 6. Integration Points for Stellar Blockchain

### **Recommended Integration Areas**

1. **Contract Immutability:**
   - Current: Contracts stored in SQLite (mutable)
   - Integration: Record contract hashes on Stellar blockchain
   - Location: After contract creation in workflow (Step 4: SALE_SIGNED)

2. **Payment Tracking:**
   - Current: Payment schedule in JSON/database
   - Integration: Record installment payments as Stellar transactions
   - Location: Payment processing logic (to be added)

3. **Audit Trail:**
   - Current: `audit_logs` table (unused)
   - Integration: Record audit events on Stellar as memo fields
   - Location: `server.js` audit logging

4. **Client Identity:**
   - Current: Clients stored in SQLite
   - Integration: Link client records to Stellar accounts
   - Location: Client creation/management endpoints

### **Technical Considerations**

- **Stellar SDK:** Will need to add Stellar SDK for JavaScript/Node.js
- **Wallet Management:** Stellar keypair generation and storage
- **Transaction Signing:** Secure key management for signing transactions
- **Network Selection:** Testnet vs Mainnet configuration
- **Memo Fields:** Use memo fields for contract/transaction references
- **Horizon API:** Integration with Stellar Horizon for transaction queries

### **Files Requiring Modification**

1. **Backend:**
   - `server.js` - Add Stellar transaction endpoints
   - `package.json` - Add Stellar SDK dependency

2. **Frontend:**
   - `frontend/src/pages/BlockchainAudit.jsx` - Replace mock data with real Stellar queries
   - `frontend/src/components/MurabahaCalculator.jsx` - Add blockchain recording after contract signing
   - `frontend/src/config.js` - Add Stellar network configuration

3. **Database:**
   - May need to add fields for Stellar transaction hashes, account addresses

---

## 7. Summary

**Current State:** The application is a functional desktop Electron application with a React frontend and Node.js/Express backend. Core Murabaha financing calculations and PDF generation are implemented. However, several API endpoints referenced by the frontend are missing, and the database schema needs expansion to support the full workflow.

**Blockchain Readiness:** The UI has a placeholder for blockchain audit functionality, but no actual blockchain integration exists. The architecture is well-positioned for Stellar integration, with clear separation between frontend, backend, and data layers.

**Priority Actions for Integration:**
1. Complete missing API endpoints (`/api/clients`, `/api/contracts`, `/api/update_status`)
2. Expand database schema to support contract workflow fields
3. Add Stellar SDK dependencies
4. Implement Stellar transaction recording for contracts
5. Connect Blockchain Audit page to Stellar Horizon API

---

**End of Report**

