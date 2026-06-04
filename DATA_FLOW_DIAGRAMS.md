# Data Flow Diagrams - Category & Product Registration

## 1. Category Registration Complete Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Categories Tab                                           │  │
│  │                                                          │  │
│  │ ┌──────────────────────────────────────────────────┐   │  │
│  │ │ Register New Drug Category Form                  │   │  │
│  │ │ ────────────────────────────────────────────── │   │  │
│  │ │ Name: [Antibiotics________________]             │   │  │
│  │ │ Description: [Optional description]             │   │  │
│  │ │ [Register Category] [Refresh]                   │   │  │
│  │ └──────────────────────────────────────────────────┘   │  │
│  │                                                          │  │
│  │ ┌──────────────────────────────────────────────────┐   │  │
│  │ │ Active Drug Categories                            │   │  │
│  │ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │   │  │
│  │ │ │ Antibiotic  │ │ Antiviral   │ │ Analgesic   │ │   │  │
│  │ │ └─────────────┘ └─────────────┘ └─────────────┘ │   │  │
│  │ └──────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                              ▲
         │ 1. Click "Register Category" │
         │ 2. Frontend validates        │ 8. Update UI
         │ 3. POST /api/categories      │
         ▼                              │
┌─────────────────────────────────────────────────────────────────┐
│                        EXPRESS BACKEND                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ POST /api/categories                                     │  │
│  │ ──────────────────────────────────────────────────────── │  │
│  │ 4. Check permission: Admin || Pharmacist? ✓             │  │
│  │ 5. Validate name (required) ✓                           │  │
│  │ 6. Check duplicate names ✓                              │  │
│  │ 7. updateDB(state => state.categories.push(newCat))    │  │
│  │    ├─ Updates memory (instant)                          │  │
│  │    ├─ Writes to file system                             │  │
│  │    └─ Triggers async Supabase sync                      │  │
│  │                                                          │  │
│  │ 8. await pullChangesFromSupabase(true)                 │  │
│  │    ├─ Waits for sync to complete                        │  │
│  │    ├─ Forces fresh data from Supabase                   │  │
│  │    └─ Ensures consistency                                │  │
│  │                                                          │  │
│  │ 9. Return fresh category data from Supabase             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │
         │ (Behind the scenes during steps 7-8)
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE / POSTGRESQL                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ categories table                                         │  │
│  │ ──────────────────────────────────────────────────────── │  │
│  │ id         │ name           │ description              │  │
│  │ ─────────────────────────────────────────────────────── │  │
│  │ cat-12345  │ Antibiotic     │ Treats bacterial infect │  │
│  │ cat-12346  │ Antiviral      │ Fights viral infections │  │
│  │ cat-12347  │ Analgesic      │ Pain reliever           │  │
│  │ cat-12348  │ Antibiotics    │ [NEW - Just saved!]  ✨ │  │
│  │ ─────────────────────────────────────────────────────── │  │
│  │                                                          │  │
│  │ RLS Policies Applied:                                   │  │
│  │ ✓ Anyone can SELECT                                     │  │
│  │ ✓ Only Admin/Pharmacist can INSERT                     │  │
│  │ ✓ Only Admin/Pharmacist can UPDATE                     │  │
│  │ ✓ Only Admin can DELETE                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Medicine/Product Registration Flow

```
USER REGISTRATION DECISION
         │
         ▼
   ┌─────────────────┐
   │ User fills form │ (Product Name, SKU, Category, etc.)
   └─────────────────┘
         │
         ▼
   ┌──────────────────────────────┐
   │ Frontend Validation          │
   │ ✓ Name required              │
   │ ✓ SKU required               │
   │ ✓ Expiry date required       │
   │ ✓ Category selected          │
   └──────────────────────────────┘
         │
    Has Error? ─→ Show toast message and STOP
         │ No
         ▼
   POST /api/medicines
    (Body: {name, SKU, expiryDate, categoryId, ...})
    (Header: X-User-Email)
         │
         ▼
   ┌──────────────────────────────┐
   │ Backend Permission Check     │
   │ User has "addProducts"? ✓    │
   └──────────────────────────────┘
         │
    Not allowed? ─→ 403 Forbidden and STOP
         │ Yes
         ▼
   ┌──────────────────────────────┐
   │ Backend Validation           │
   │ ✓ Name not empty             │
   │ ✓ SKU not empty              │
   │ ✓ Expiry date valid          │
   │ ✓ Barcode not duplicate      │
   │ ✓ Category exists            │
   └──────────────────────────────┘
         │
   Validation failed? ─→ 400 Bad Request and STOP
         │ Pass
         ▼
   updateDB(state => {
     state.medicines.push(newMed)
     state.inventoryLogs.push(...)
     state.auditLogs.push(...)
   })
   ├─ Updates local memory (instant UX)
   ├─ Writes to file (persistent backup)
   └─ Queues Supabase sync (background)
         │
         ▼
   [CRITICAL] await pullChangesFromSupabase(true)
   ├─ Syncs changes to Supabase
   ├─ Waits for sync to complete
   └─ Pulls fresh data back
         │
         ▼
   const saved = readDB().medicines.find(m => m.id === newMed.id)
   res.json(saved)
         │
         ▼
   ┌──────────────────────────────┐
   │ Browser Receives Response    │
   │ ✓ HTTP 201 Created           │
   │ ✓ Product data from Supabase │
   │ ✓ New ID, timestamps, etc.   │
   └──────────────────────────────┘
         │
         ▼
   ┌──────────────────────────────┐
   │ Frontend Updates UI          │
   │ ✓ Close modal                │
   │ ✓ Show success toast         │
   │ ✓ Reload product list        │
   │ ✓ Product appears instantly  │
   └──────────────────────────────┘
         │
         ▼
   ✅ SUCCESS - Data saved to Supabase, visible in UI, persists forever
```

## 3. Dashboard Update Flow

```
Initial Dashboard Load
         │
         ▼
   fetchDashboardData()
   ├─ GET /api/dashboard/metrics
   ├─ GET /api/categories
   ├─ GET /api/medicines
   ├─ GET /api/sales
   └─ GET /api/customers
         │
         ▼
   Metrics calculated from live database:
   ├─ Category Count = db.categories.length
   ├─ Medicine Count = db.medicines.length
   ├─ Expired Count = db.medicines.filter(expired).length
   └─ Low Stock Count = db.medicines.filter(lowStock).length
         │
         ▼
   Display Dashboard Cards:
   ┌──────────────────┐
   │ Categories: 12   │ ← Uses live count
   │ Products: 87     │ ← Uses live count
   │ Expired: 3       │ ← Uses live count
   │ Low Stock: 5     │ ← Uses live count
   └──────────────────┘

User Registers New Category in Categories Tab
         │
         ▼
   updateDB() → syncToSupabase() → pullfromSupabase()
         │
         ▼
   Category saved to Supabase
         │
         ▼
   User Navigates Back to Dashboard
         │
         ▼
   useEffect(() => {
     if (selectedWeekId changed) {
       fetchDashboardData()
     }
   })
         │
         ▼
   Metrics recalculated with NEW category count
   ┌──────────────────┐
   │ Categories: 13   │ ← Updated! ✨
   │ Products: 87     │
   │ Expired: 3       │
   │ Low Stock: 5     │
   └──────────────────┘
```

## 4. Data Sync Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYERS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  LAYER 1: Browser UI                                             │
│  ├─ Categories.tsx                                               │
│  ├─ Medicines.tsx                                                │
│  └─ Dashboard.tsx                                                │
│                    │                                              │
│                    ├→ HTTP POST /api/categories                  │
│                    ├→ HTTP POST /api/medicines                   │
│                    ├→ HTTP GET /api/dashboard/metrics            │
│                    └→ HTTP GET /api/categories                   │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  LAYER 2: Express Backend (server.ts)                            │
│  ├─ API Endpoints                                                │
│  ├─ Permission Checks                                            │
│  └─ Validation Logic                                             │
│                    │                                              │
│                    ├→ updateDB() [SYNC]                          │
│                    └→ await pullChangesFromSupabase() [SYNC]     │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  LAYER 3: Local Database (server_db.ts)                          │
│  ├─ globalStateCache (memory)                                    │
│  ├─ data_store.json (file system)                                │
│  └─ Sync Manager                                                 │
│                    │                                              │
│                    ├→ syncChangesToSupabase() [ASYNC]            │
│                    └→ pullChangesFromSupabase() [ASYNC]          │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  LAYER 4: Supabase (Remote PostgreSQL)                           │
│  ├─ categories table                                             │
│  ├─ medicines table                                              │
│  ├─ RLS Policies (security)                                      │
│  └─ Source of Truth                                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

DATA FLOW IN WRITE OPERATION:

Browser → Server → updateDB() ┐
                             ├─ Memory (instant)
                             ├─ File System (persistent)
                             └─ Supabase (authoritative)
                                    ↓
                            [Server waits for sync]
                                    ↓
                            Pull fresh from Supabase
                                    ↓
                            Return to Browser
                                    ↓
                            UI updates with fresh data
                                    ↓
                            ✅ DATA SAVED PERMANENTLY
```

## 5. Permission Flow Diagram

```
┌─────────────────────────────────────────────┐
│ User Action: "Register Category"            │
└─────────────────────────────────────────────┘
         │
         ▼
    ┌────────────────────┐
    │ Frontend RBAC      │
    │ Check: User role   │
    │ Can "addCategories"?
    │                    │
    │ ✓ Admin      → Show button
    │ ✓ Pharmacist → Show button
    │ ✗ Other      → Hide button
    └────────────────────┘
         │
         ▼ (Button click if visible)
    ┌────────────────────┐
    │ POST /api/categories
    │ Header: X-User-Email
    └────────────────────┘
         │
         ▼
    ┌────────────────────┐
    │ Backend RBAC       │
    │ checkPermission()  │
    │                    │
    │ ✓ Valid user?      │
    │ ✓ Admin/Pharm?     │
    │                    │
    │ No  → 403 Error    │
    │ Yes → Proceed      │
    └────────────────────┘
         │
         ▼ (Only if permission OK)
    ┌────────────────────┐
    │ updateDB()         │
    │ Save to cache      │
    │ Sync to Supabase   │
    └────────────────────┘
         │
         ▼
    ┌────────────────────┐
    │ Supabase RLS       │
    │ INSERT policy:     │
    │                    │
    │ Can Admin/Pharm    │
    │ insert categories? │
    │                    │
    │ No  → RLS Error    │
    │ Yes → Insert ✓     │
    └────────────────────┘
         │
         ▼
    ✅ Category inserted
    🔐 Protected at 3 levels:
       - Frontend (UX)
       - Backend (Security)
       - Database (RLS)
```

## 6. Error Recovery Flow

```
USER OPERATION FAILS
         │
         ▼
┌─────────────────────────────────┐
│ Where did it fail?              │
├─────────────────────────────────┤
│ (1) Frontend validation?         │
│     → Show error in form         │
│     → Don't call API             │
│                                  │
│ (2) API permission denied?       │
│     → 403 Forbidden              │
│     → Backend logs reason        │
│     → Show: "Permission denied"  │
│                                  │
│ (3) Data validation error?       │
│     → 400 Bad Request            │
│     → Show specific error        │
│     → e.g., "SKU already used"   │
│                                  │
│ (4) Supabase sync failed?        │
│     → Logged in server console   │
│     → Data in local cache        │
│     → Retry on next operation    │
│                                  │
│ (5) Network error?               │
│     → Network exception          │
│     → Show: "Network error"      │
│     → User can retry             │
└─────────────────────────────────┘
         │
         ▼
USER SEES ERROR MESSAGE
    (Clear, non-technical)
         │
         ▼
   User can fix and retry
   OR navigate away and try again
```

These diagrams show how the system works from user click through database persistence.
