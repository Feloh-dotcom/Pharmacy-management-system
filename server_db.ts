/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Buffer } from "buffer";
import { createClient } from "@supabase/supabase-js";
import { 
  User, UserRole, Medicine, Category, Supplier, Customer, 
  Sale, InventoryLog, PurchaseOrder, FinanceRecord, AuditLog,
  SystemSettings, Branch, DeveloperApiKey, RolePermissions, BackupCheckpoint,
  CashSession, CashTransaction
} from "./src/types";

// Dynamic Supabase client configuration
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";

const keysToCheck = [
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  process.env.SUPABASE_KEY,
  process.env.SUPABASE_ANON_KEY,
  process.env.VITE_SUPABASE_ANON_KEY,
];

const validKey = keysToCheck.find(k => k && k.trim() !== "" && k.trim() !== "placeholder_not_configured");
const supabaseKey = (validKey || "").trim();

export const supabase = createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseKey || "placeholder");

export function hasServiceRole(): boolean {
  const realKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!realKey || typeof realKey !== "string") return false;
  if (realKey.startsWith("sb_secret_")) return true;
  if (!realKey.includes(".")) return false;
  try {
    const parts = realKey.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

export function verifyServiceRoleRequirement(actionName: string) {
  const isRender = !!(process.env.RENDER || process.env.RENDER_SERVICE_ID || process.env.NODE_ENV === "production");
  if (isRender && !hasServiceRole()) {
    throw new Error(`CRITICAL CONFIGURATION ERROR: Backend write for [${actionName}] requested, but Supabase Service Role Key (SUPABASE_SERVICE_ROLE_KEY) is missing or invalid in Render production environment. All backend writes require service role privileges to bypass Row Level Security (RLS).`);
  }
}

export const isRealKeyConfigured = true;
export const isSupabaseDisabled = false;

export function isSupabaseActive(): boolean {
  return true;
}

export function hashPassword(password: string, salt?: string) {
  const finalSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, finalSalt, 1000, 64, "sha512").toString("hex");
  return { salt: finalSalt, hash };
}

const DATA_FILE = path.join(process.cwd(), "data_store.json");

export interface DBState {
  users: User[];
  categories: Category[];
  medicines: Medicine[];
  suppliers: Supplier[];
  customers: Customer[];
  sales: Sale[];
  inventoryLogs: InventoryLog[];
  purchaseOrders: PurchaseOrder[];
  financeRecords: FinanceRecord[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
  branches: Branch[];
  apiKeys: DeveloperApiKey[];
  rolePermissions: RolePermissions[];
  backups: BackupCheckpoint[];
  cashSessions: CashSession[];
  weeklyCycles?: any[];
  mpesaTransactions?: any[];
}

const initialData: DBState = {
  users: [],
  categories: [],
  medicines: [],
  suppliers: [],
  customers: [],
  sales: [],
  inventoryLogs: [],
  purchaseOrders: [],
  financeRecords: [],
  auditLogs: [],
  settings: {
    general: {
      pharmacyName: "Halomedical Pharmacy Central",
      email: "contact@halomedical.org",
      phone: "+254 700 000000",
      address: "Biomedical Tower, Suite 402, Nairobi, KE",
      country: "Kenya",
      timezone: "Africa/Nairobi",
      currency: "Ksh.",
      dateFormat: "YYYY-MM-DD",
      language: "en",
      logoUrl: "",
      registrationNumber: "PHARM-REG-2026-9901"
    },
    security: {
      passwordMinLength: 8,
      requireSpecialChar: true,
      sessionTimeout: 30,
      mfaEnabled: false,
      ipWhitelist: "",
      accountLockoutAttempts: 5,
      failedLoginMonitoring: true
    },
    financial: {
      vatPercentage: 16,
      taxPercentage: 2,
      currencyPrecision: 2,
      invoiceNumberPrefix: "INV-2026-",
      financialYearStart: "2026-01-01",
      selectedPaymentMethods: ["Cash", "Card", "M-Pesa"]
    },
    inventory: {
      autoReorderThreshold: 15,
      expiryWarningPeriodDays: 45,
      batchTrackingEnabled: true,
      barcodeScanningEnabled: true,
      lowStockAlertActive: true,
      aiStockPredictionActive: true,
      expiryAlertSeverity: "high",
      preventSaleOfExpiredGoods: true,
      notifyOnExpiryNear: true
    },
    notifications: {
      emailAlerts: true,
      smsAlerts: false,
      pushAlerts: true,
      whatsappAlerts: false,
      smtpHost: "smtp.halomedical.org",
      smtpPort: 587,
      smtpUsername: "alerts@halomedical.org",
      smtpPassword: "••••••••••••••••"
    },
    integrations: {
      cloudinaryApiKey: "CLD-91823901-SEC",
      stripeSecretKey: "sk_test_51Mz...",
      awsS3Bucket: "halomed-clinical-vault",
      twilioSid: "AC440291039a...",
      googleAnalyticsId: "G-882910"
    },
    aiAutomation: {
      aiReorderSmartThreshold: 85,
      aiPredictiveExpiryForecast: true,
      aiNaturalLanguageCopilot: true,
      geminiModelSelection: "gemini-2.5-flash"
    },
    appearance: {
      themeMode: "light",
      sidebarStyle: "standard-teal",
      themeColors: "Teal-SaaS",
      borderRadius: 16,
      animationSpeed: "normal"
    },
    receipts: {
      receiptFooterText: "Thank you for trusting Halomedical Pharmacy. Call us at 0700 000000.",
      invoicePrefix: "INV-",
      showTaxBreakdown: true,
      paperSize: "80mm"
    },
    maintenance: {
      maintenanceMode: false,
      cacheExpiryMinutes: 15
    }
  },
  branches: [],
  apiKeys: [],
  rolePermissions: [
    {
      role: "Admin",
      permissions: {
        manageMedicines: true,
        deleteSales: true,
        viewReports: true,
        approvePurchases: true,
        manageInventory: true,
        modifySettings: true,
        addProducts: true,
        editProducts: true,
        addCategories: true,
        editCategories: true,
        adjustStock: true
      }
    },
    {
      role: "Pharmacist",
      permissions: {
        manageMedicines: true,
        deleteSales: false,
        viewReports: true,
        approvePurchases: false,
        manageInventory: true,
        modifySettings: false,
        addProducts: true,
        editProducts: true,
        addCategories: true,
        editCategories: true,
        adjustStock: true
      }
    },
    {
      role: "Cashier",
      permissions: {
        manageMedicines: true,
        deleteSales: false,
        viewReports: false,
        approvePurchases: false,
        manageInventory: true,
        modifySettings: false,
        addProducts: false,
        editProducts: false,
        addCategories: false,
        editCategories: false,
        adjustStock: false
      }
    },
    {
      role: "Customer",
      permissions: {
        manageMedicines: false,
        deleteSales: false,
        viewReports: false,
        approvePurchases: false,
        manageInventory: false,
        modifySettings: false,
        addProducts: false,
        editProducts: false,
        addCategories: false,
        editCategories: false,
        adjustStock: false
      }
    },
    {
      role: "Supplier",
      permissions: {
        manageMedicines: false,
        deleteSales: false,
        viewReports: false,
        approvePurchases: false,
        manageInventory: false,
        modifySettings: false,
        addProducts: false,
        editProducts: false,
        addCategories: false,
        editCategories: false,
        adjustStock: false
      }
    },
    {
      role: "Accountant",
      permissions: {
        manageMedicines: false,
        deleteSales: false,
        viewReports: true,
        approvePurchases: false,
        manageInventory: false,
        modifySettings: false,
        addProducts: false,
        editProducts: false,
        addCategories: false,
        editCategories: false,
        adjustStock: false
      }
    },
    {
      role: "Inventory Manager",
      permissions: {
        manageMedicines: true,
        deleteSales: false,
        viewReports: true,
        approvePurchases: false,
        manageInventory: true,
        modifySettings: false,
        addProducts: true,
        editProducts: true,
        addCategories: true,
        editCategories: true,
        adjustStock: true
      }
    },
    {
      role: "User",
      permissions: {
        manageMedicines: false,
        deleteSales: false,
        viewReports: false,
        approvePurchases: false,
        manageInventory: false,
        modifySettings: false,
        addProducts: false,
        editProducts: false,
        addCategories: false,
        editCategories: false,
        adjustStock: false
      }
    }
  ],
  backups: [],
  cashSessions: [],
  weeklyCycles: [],
  mpesaTransactions: []
};

export function toUUIDIfNeeded(val: any): any {
  if (typeof val !== "string") return val;
  // If it is already a valid UUID, return it directly
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(val)) return val;
  
  // Create deterministic UUID based on input string (e.g. "cat-1", "med-22")
  const hash = crypto.createHash("sha256").update(val).digest("hex");
  const part1 = hash.substring(0, 8);
  const part2 = hash.substring(8, 12);
  const part3 = "4" + hash.substring(13, 16); // Set UUID version 4
  const part4 = (parseInt(hash.substring(16, 18), 16) & 0x3f | 0x80).toString(16).padStart(2, '0') + hash.substring(18, 20); // Variant 1
  const part5 = hash.substring(20, 32);
  return `${part1}-${part2}-${part3}-${part4}-${part5}`.toLowerCase();
}

export function normalizeRole(role: string): string {
  if (!role || typeof role !== "string") return "user";
  const normalized = role.trim().toLowerCase();
  if (normalized === "admin" || normalized === "super admin") {
    return "admin";
  } else if (normalized === "pharmacist") {
    return "pharmacist";
  } else if (normalized === "cashier") {
    return "cashier";
  } else if (normalized === "customer") {
    return "customer";
  } else if (normalized === "supplier") {
    return "supplier";
  } else if (normalized === "accountant") {
    return "accountant";
  } else if (normalized === "inventory manager" || normalized === "inventory_manager") {
    return "inventory_manager";
  } else if (normalized === "user") {
    return "user";
  }
  return "user";
}

// --- Mappings Configurations ---
export const tableMappings: Record<string, { table: string; keyMap: Record<string, string> }> = {
  users: {
    table: "profiles",
    keyMap: {
      id: "id",
      name: "name",
      fullName: "name",
      email: "email",
      role: "role",
      avatarUrl: "avatar_url",
      isActive: "is_active",
      createdAt: "created_at",
      phone: "phone",
      bio: "bio",
      nationalId: "national_id",
      address: "address",
      verificationStatus: "verification_status"
    }
  },
  categories: {
    table: "categories",
    keyMap: {
      id: "id",
      name: "name",
      description: "description"
    }
  },
  suppliers: {
    table: "suppliers",
    keyMap: {
      id: "id",
      name: "name",
      email: "email",
      phone: "phone",
      companyName: "company_name",
      address: "address"
    }
  },
  medicines: {
    table: "medicines",
    keyMap: {
      id: "id",
      name: "name",
      genericName: "generic_name",
      SKU: "sku",
      batchNumber: "batch_number",
      expiryDate: "expiry_date",
      buyingPrice: "buying_price",
      sellingPrice: "selling_price",
      quantity: "quantity",
      minStockLevel: "min_stock_level",
      manufacturer: "manufacturer",
      supplierId: "supplier_id",
      categoryId: "category_id",
      barcode: "barcode",
      taxVat: "tax_vat",
      prescriptionRequired: "prescription_required",
      createdAt: "created_at"
    }
  },
  customers: {
    table: "customers",
    keyMap: {
      id: "id",
      name: "full_name",
      email: "email",
      phone: "phone",
      loyaltyPoints: "loyalty_points",
      insuranceProvider: "insurance_provider",
      insurancePolicyNumber: "insurance_policy_number",
      copayPercent: "copay_percent"
    }
  },
  sales: {
    table: "sales",
    keyMap: {
      id: "id",
      customerId: "customer_id",
      customerName: "customer_name",
      customerEmail: "customer_email",
      invoiceNumber: "invoice_number",
      items: "items",
      totalPrice: "total_amount",
      discount: "discount_amount",
      taxAmount: "tax_amount",
      paymentMethod: "payment_method",
      paymentStatus: "payment_status",
      cashierEmail: "cashier_id",
      date: "sold_at"
    }
  },
  inventoryLogs: {
    table: "inventory_logs",
    keyMap: {
      id: "id",
      medicineId: "medicine_id",
      medicineName: "medicine_name",
      type: "type",
      quantity: "quantity",
      date: "created_at",
      reason: "reason",
      userEmail: "user_email",
      action: "action"
    }
  },
  purchaseOrders: {
    table: "purchase_orders",
    keyMap: {
      id: "id",
      supplierId: "supplier_id",
      supplierName: "supplier_name",
      items: "items",
      totalAmount: "total_amount",
      status: "status",
      orderDate: "order_date",
      receivedDate: "received_date"
    }
  },
  financeRecords: {
    table: "finance_records",
    keyMap: {
      id: "id",
      type: "record_type",
      category: "category",
      amount: "amount",
      description: "description",
      paymentMethod: "payment_method",
      date: "recorded_at"
    }
  },
  auditLogs: {
    table: "audit_logs",
    keyMap: {
      id: "id",
      action: "action",
      module: "module",
      date: "created_at",
      details: "details"
    }
  },
  branches: {
    table: "branches",
    keyMap: {
      id: "id",
      name: "name",
      code: "code",
      address: "address",
      phone: "phone",
      isActive: "is_active",
      inventorySynced: "inventory_synced"
    }
  },
  apiKeys: {
    table: "api_keys",
    keyMap: {
      id: "id",
      name: "name",
      apiKey: "api_key",
      createdAt: "created_at",
      expiresAt: "expires_at",
      status: "status"
    }
  },
  rolePermissions: {
    table: "role_permissions",
    keyMap: {
      role: "role",
      permissions: "permissions"
    }
  },
  backups: {
    table: "backups",
    keyMap: {
      id: "id",
      filename: "filename",
      size: "size",
      createdAt: "created_at",
      storageProvider: "storage_provider",
      status: "status"
    }
  },
  cashSessions: {
    table: "cash_sessions",
    keyMap: {
      id: "id",
      status: "status",
      openedAt: "opened_at",
      openedBy: "opened_by",
      openingBalance: "opening_cash",
      closedAt: "closed_at",
      closedBy: "closed_by",
      expectedClosingBalance: "expected_cash",
      actualClosingBalance: "actual_cash",
      variance: "discrepancy",
      notes: "notes",
      totalSalesAmount: "total_sales_amount",
      totalMpesaAmount: "total_mpesa_amount",
      totalCashAmount: "total_cash_amount",
      totalDiscounts: "total_discounts",
      totalRefunds: "total_refunds",
      totalExpenses: "total_expenses"
    }
  },
  weeklyCycles: {
    table: "weekly_cycles",
    keyMap: {
      id: "id",
      status: "status",
      startDate: "cycle_start",
      endDate: "cycle_end",
      graphReport: "graph_report",
      weeklyRevenue: "weekly_revenue",
      totalSalesOverview: "total_sales_overview"
    }
  },
  mpesaTransactions: {
    table: "mpesa_transactions",
    keyMap: {
      id: "id",
      transactionCode: "transaction_code",
      amount: "amount",
      accountReference: "account_reference",
      phoneNumber: "phone_number",
      customerName: "customer_name",
      timestamp: "timestamp",
      status: "status",
      isClaimed: "is_claimed"
    }
  }
};

const disabledTables = new Set<string>();

// --- Bidirectional conversion helpers for robust snake_case database interfacing ---
function findUserByUUID(userIdOrUUID: string): any {
  const users = (globalStateCache && globalStateCache.users) || [];
  const match = users.find(u => {
    if (u.id === userIdOrUUID) return true;
    if (toUUIDIfNeeded(u.id) === userIdOrUUID) return true;
    return false;
  });
  if (match) {
    return {
      id: match.id,
      name: match.name,
      email: match.email,
      role: match.role
    };
  }
  return {
    id: userIdOrUUID,
    name: "System Operator",
    email: "system@halomedical.com",
    role: "Admin"
  };
}

export function mapToRow(configName: string, item: any): any {
  if (!item) return item;

  if (configName === "mpesaTransactions") {
    const row: any = {};
    row.id = item.id || item.TransID || `mpesa-${Date.now()}`;
    row.transaction_code = item.transactionCode || item.TransID || "";
    row.amount = Number(item.amount || item.TransAmount || 0);
    row.account_reference = item.accountReference || item.BillRefNumber || "N/A";
    row.phone_number = item.phoneNumber || item.MSISDN || "";
    row.customer_name = item.customerName || `${item.FirstName || ""} ${item.MiddleName || ""} ${item.LastName || ""}`.trim() || "M-PESA SUBSCRIBER";
    row.timestamp = item.timestamp || item.TransTime || new Date().toISOString();
    row.status = item.status || "Success";
    row.is_claimed = item.claimed !== undefined ? item.claimed : (item.isClaimed !== undefined ? item.isClaimed : false);
    return row;
  }

  const config = tableMappings[configName];
  if (!config) return item;
  const row: any = {};
  for (const [camelKey, snakeKey] of Object.entries(config.keyMap)) {
    if (item[camelKey] !== undefined) {
      let val = item[camelKey];
      // Convert raw strings for ID/Foreign Key columns to deterministic UUIDs if we target a potential UUID field
      if (
        snakeKey === "id" ||
        snakeKey === "category_id" ||
        snakeKey === "supplier_id" ||
        snakeKey === "medicine_id" ||
        snakeKey === "customer_id" ||
        snakeKey === "cashier_id"
      ) {
        if (typeof val === "string") {
          val = toUUIDIfNeeded(val);
        }
      }
      if (snakeKey === "opened_by" || snakeKey === "closed_by") {
        if (val && typeof val === "object") {
          val = toUUIDIfNeeded(val.id);
        } else if (typeof val === "string") {
          val = toUUIDIfNeeded(val);
        }
      }
      if ((configName === "users" || configName === "rolePermissions") && snakeKey === "role" && typeof val === "string") {
        val = normalizeRole(val);
      }
      if (configName === "users" && snakeKey === "verification_status" && typeof val === "string") {
        const normalized = val.trim().toLowerCase();
        if (normalized === "verified" || normalized === "approved") {
          val = "approved";
        } else if (normalized === "rejected") {
          val = "rejected";
        } else {
          val = "pending";
        }
      }
      if (configName === "financeRecords" && snakeKey === "payment_method") {
        if (val) {
          const lower = String(val).toLowerCase().trim();
          if (lower.includes("mpesa") || lower.includes("m-pesa")) {
            val = "mpesa";
          } else if (lower.includes("cash")) {
            val = "cash";
          } else if (lower.includes("card")) {
            val = "card";
          } else if (lower.includes("bank")) {
            val = "bank";
          } else if (lower.includes("split")) {
            val = "split";
          } else {
            val = "cash";
          }
        } else {
          val = "cash";
        }
      }
      row[snakeKey] = val;
    }
  }

  // 1. Extra logic for Users/Profiles table
  if (configName === "users") {
    row.name = item.name || item.fullName || "System User";
    row.full_name = item.name || item.fullName || "System User";
    if (!row.role) {
      row.role = "pharmacist";
    } else {
      row.role = normalizeRole(row.role);
    }
    if (!row.verification_status) {
      row.verification_status = "approved";
    }
  }

  // 2. Extra logic for inventoryLogs
  if (configName === "inventoryLogs") {
    const users = (globalStateCache && globalStateCache.users) || [];
    let actorId = item.actorId || row.actor_id;
    if (!actorId) {
      if (item.userEmail) {
        const matchedUser = users.find(u => u.email === item.userEmail);
        if (matchedUser) {
          actorId = toUUIDIfNeeded(matchedUser.id);
        } else {
          actorId = toUUIDIfNeeded(item.userEmail);
        }
      } else {
        const matchedSystem = users.find(u => u.email === "system@halomedical.com");
        if (matchedSystem) {
          actorId = toUUIDIfNeeded(matchedSystem.id);
        } else {
          actorId = toUUIDIfNeeded("system@halomedical.com");
        }
      }
    }
    
    // Validate if actor_id references a profile that actually exists
    const profileExists = users.some(u => u.id === actorId || toUUIDIfNeeded(u.id) === actorId);
    if (profileExists) {
      row.actor_id = actorId;
    } else {
      if (users.length > 0) {
        row.actor_id = toUUIDIfNeeded(users[0].id);
      } else {
        row.actor_id = null;
      }
    }
    
    // Ensure row.action is always supplied!
    row.action = item.type || row.type || "sale";
  }

  // 3. Extra logic for cashSessions
  if (configName === "cashSessions") {
    if (item.status !== undefined) {
      const statusVal = String(item.status || "open").toLowerCase();
      row.status = statusVal;
    }
    
    // Convert status to lowercase if present in mapped row
    if (row.status !== undefined) {
      row.status = String(row.status).toLowerCase();
    }

    // opening cash
    const openingVal = item.openingBalance !== undefined ? Number(item.openingBalance) : (item.opening_cash !== undefined ? Number(item.opening_cash) : (item.opening_balance !== undefined ? Number(item.opening_balance) : undefined));
    if (openingVal !== undefined) {
      row.opening_cash = openingVal;
    }

    // expected closing
    const expectedVal = item.expectedClosingBalance !== undefined ? Number(item.expectedClosingBalance) : (item.expected_cash !== undefined ? Number(item.expected_cash) : (item.expected_closing_balance !== undefined ? Number(item.expected_closing_balance) : undefined));
    if (expectedVal !== undefined) {
      row.expected_cash = expectedVal;
    }

    // actual closing
    const actualVal = item.actualClosingBalance !== undefined ? Number(item.actualClosingBalance) : (item.actual_cash !== undefined ? Number(item.actual_cash) : (item.actual_closing_balance !== undefined ? Number(item.actual_closing_balance) : undefined));
    if (actualVal !== undefined) {
      row.actual_cash = actualVal;
    }

    // variance / discrepancy
    const discrepancyVal = item.variance !== undefined ? Number(item.variance) : (item.discrepancy !== undefined ? Number(item.discrepancy) : undefined);
    if (discrepancyVal !== undefined) {
      row.discrepancy = discrepancyVal;
    }

    // opened_by
    const openedById = item.openedBy !== undefined ? (typeof item.openedBy === "object" && item.openedBy ? toUUIDIfNeeded(item.openedBy.id) : toUUIDIfNeeded(item.openedBy)) : (row.opened_by !== undefined ? toUUIDIfNeeded(row.opened_by) : undefined);
    if (openedById !== undefined) {
      row.opened_by = openedById;
    }

    // closed_by
    const closedById = item.closedBy !== undefined ? (typeof item.closedBy === "object" && item.closedBy ? toUUIDIfNeeded(item.closedBy.id) : toUUIDIfNeeded(item.closedBy)) : (row.closed_by !== undefined ? toUUIDIfNeeded(row.closed_by) : undefined);
    if (closedById !== undefined) {
      row.closed_by = closedById;
    }

    // Note/notes
    if (item.notes !== undefined || item.note !== undefined) {
      row.notes = item.notes || item.note || "";
    }

    // Map additional JSONB column fields if provided in item
    if (item.salesInvoices !== undefined) {
      row.sales_invoices = item.salesInvoices;
    }
    if (item.mpesaTransactionsAndAmounts !== undefined) {
      row.mpesa_transactions_and_amounts = item.mpesaTransactionsAndAmounts;
    }
    if (item.cashTransactions !== undefined) {
      row.cash_transactions = item.cashTransactions;
    }
  }

  if (configName === "customers") {
    row.notes = JSON.stringify(item.prescriptionHistory || []);
  }

  if (configName === "sales") {
    // Resolve cashierEmail to profile UUID
    const users = (globalStateCache && globalStateCache.users) || [];
    if (item.cashierEmail) {
      const matchedUser = users.find(u => u.email.toLowerCase() === String(item.cashierEmail).toLowerCase());
      if (matchedUser) {
        row.cashier_id = toUUIDIfNeeded(matchedUser.id);
      } else {
        row.cashier_id = toUUIDIfNeeded(item.cashierEmail);
      }
    }

    // Resolve customerId to customer ID/UUID or set to null
    if (item.customerId && item.customerId !== "cust-cash") {
      const customers = (globalStateCache && globalStateCache.customers) || [];
      const matchedCustomer = customers.find(c => c.id === item.customerId);
      if (matchedCustomer) {
        row.customer_id = toUUIDIfNeeded(matchedCustomer.id);
      } else {
        row.customer_id = toUUIDIfNeeded(item.customerId);
      }
    } else {
      row.customer_id = null;
    }

    const total = Number(item.totalPrice || 0);
    const discount = Number(item.discount || 0);
    const tax = Number(item.taxAmount || 0);
    row.subtotal = Number((total + discount - tax).toFixed(2));
    
    let paidVal = 0;
    if (item.paymentMethod === "Cash") {
      paidVal = item.cashPaid !== undefined ? Number(item.cashPaid) : total;
    } else if (item.paymentMethod === "M-Pesa") {
      paidVal = item.mpesaPaid !== undefined ? Number(item.mpesaPaid) : total;
    } else if (item.paymentMethod === "Card") {
      paidVal = total;
    } else if (item.paymentMethod === "Split") {
      paidVal = Number(item.cashPaid || 0) + Number(item.mpesaPaid || 0);
    }
    row.amount_paid = paidVal;

    let changeVal = 0;
    if (item.paymentMethod === "Cash" && item.cashPaid !== undefined) {
      changeVal = Math.max(0, Number(item.cashPaid) - total);
    } else if (item.paymentMethod === "Split" && paidVal > total) {
      changeVal = paidVal - total;
    }
    row.change_amount = Number(changeVal.toFixed(2));

    row.payment_method = String(item.paymentMethod || "cash").toLowerCase();
    
    let payStatus = "paid";
    if (item.paymentStatus) {
      const psLower = item.paymentStatus.toLowerCase();
      if (psLower.includes("refund")) payStatus = "refunded";
      else if (psLower.includes("pend")) payStatus = "pending";
    }
    row.payment_status = payStatus;
    row.sale_status = "completed";

    // Serialize extra fields into notes JSON
    const meta = {
      cashPaid: item.cashPaid,
      mpesaPaid: item.mpesaPaid,
      mpesaTransactionCode: item.mpesaTransactionCode,
      mpesaPhoneNumber: item.mpesaPhoneNumber,
      customNotes: item.notes || item.note || "",
      items: item.items || [],
      customerName: item.customerName,
      customerEmail: item.customerEmail
    };
    row.notes = JSON.stringify(meta);
  }
  return row;
}

export function mapFromRow(configName: string, row: any): any {
  if (!row) return row;

  if (configName === "mpesaTransactions") {
    const item: any = {};
    item.TransID = row.transaction_code;
    item.TransAmount = String(row.amount);
    item.MSISDN = row.phone_number;
    const nameParts = (row.customer_name || "M-PESA SUBSCRIBER").split(" ");
    item.FirstName = nameParts[0] || "M-PESA";
    item.MiddleName = nameParts.length > 2 ? nameParts[1] : "";
    item.LastName = nameParts.length > 2 ? nameParts.slice(2).join(" ") : (nameParts[1] || "SUBSCRIBER");
    item.BillRefNumber = row.account_reference;
    item.TransTime = row.timestamp;
    item.claimed = row.is_claimed;
    item.id = row.id;
    return item;
  }

  const config = tableMappings[configName];
  if (!config) return row;
  const item: any = {};
  for (const [camelKey, snakeKey] of Object.entries(config.keyMap)) {
    if (row[snakeKey] !== undefined) {
      let val = row[snakeKey];
      if ((configName === "users" || configName === "rolePermissions") && snakeKey === "role" && typeof val === "string") {
        const lowerVal = val.toLowerCase().trim();
        if (lowerVal === "admin") val = "Admin";
        else if (lowerVal === "pharmacist") val = "Pharmacist";
        else if (lowerVal === "cashier") val = "Cashier";
        else if (lowerVal === "inventory manager" || lowerVal === "inventory_manager") val = "Inventory Manager";
        else if (lowerVal === "supplier") val = "Supplier";
        else if (lowerVal === "customer") val = "Customer";
        else if (lowerVal === "accountant") val = "Accountant";
        else if (lowerVal === "user") val = "User";
        else val = "User";
      }
      if (configName === "users" && snakeKey === "verification_status" && typeof val === "string") {
        const lowerVal = val.toLowerCase().trim();
        if (lowerVal === "approved" || lowerVal === "verified") {
          val = "Verified";
        } else if (lowerVal === "rejected") {
          val = "Rejected";
        } else {
          val = "Pending";
        }
      }
      item[camelKey] = val;
    }
  }
  if (configName === "cashSessions") {
    if (row.sales_invoices !== undefined && row.sales_invoices !== null) {
      if (typeof row.sales_invoices === "string") {
        try { item.salesInvoices = JSON.parse(row.sales_invoices); } catch { item.salesInvoices = []; }
      } else {
        item.salesInvoices = Array.isArray(row.sales_invoices) ? row.sales_invoices : [];
      }
    } else {
      item.salesInvoices = [];
    }

    if (row.mpesa_transactions_and_amounts !== undefined && row.mpesa_transactions_and_amounts !== null) {
      if (typeof row.mpesa_transactions_and_amounts === "string") {
        try { item.mpesaTransactionsAndAmounts = JSON.parse(row.mpesa_transactions_and_amounts); } catch { item.mpesaTransactionsAndAmounts = []; }
      } else {
        item.mpesaTransactionsAndAmounts = Array.isArray(row.mpesa_transactions_and_amounts) ? row.mpesa_transactions_and_amounts : [];
      }
    } else {
      item.mpesaTransactionsAndAmounts = [];
    }

    if (row.cash_transactions !== undefined && row.cash_transactions !== null) {
      if (typeof row.cash_transactions === "string") {
        try { item.cashTransactions = JSON.parse(row.cash_transactions); } catch { item.cashTransactions = []; }
      } else {
        item.cashTransactions = Array.isArray(row.cash_transactions) ? row.cash_transactions : [];
      }
    } else {
      item.cashTransactions = [];
    }

    if (typeof item.status === "string") {
      const lowerStatus = item.status.toLowerCase().trim();
      item.status = (lowerStatus === "open" ? "Open" : "Closed") as any;
    }
    item.openingBalance = Number(row.opening_cash || 0);
    item.expectedClosingBalance = Number(row.expected_cash || 0);
    item.actualClosingBalance = row.actual_cash !== null ? Number(row.actual_cash) : undefined;
    item.variance = row.discrepancy !== null ? Number(row.discrepancy) : undefined;
    item.note = row.notes || "";
    item.notes = row.notes || "";

    if (typeof item.openedBy === "string") {
      item.openedBy = findUserByUUID(item.openedBy);
    } else if (!item.openedBy || typeof item.openedBy !== "object" || !item.openedBy.name) {
      item.openedBy = findUserByUUID(String(item.openedBy || "system"));
    }

    if (item.closedBy !== undefined && item.closedBy !== null) {
      if (typeof item.closedBy === "string") {
        item.closedBy = findUserByUUID(item.closedBy);
      } else if (typeof item.closedBy !== "object" || !item.closedBy.name) {
        item.closedBy = findUserByUUID(String(item.closedBy));
      }
    }
  }
  if (configName === "customers") {
    item.prescriptionHistory = [];
    if (row.notes) {
      try {
        const decoded = JSON.parse(row.notes);
        if (Array.isArray(decoded)) {
          item.prescriptionHistory = decoded;
        }
      } catch (e) {
        // Fallback or ignore if plain text notes
      }
    }
  }
  if (configName === "sales") {
    // Standardize payment method capitalization
    if (typeof item.paymentMethod === "string") {
      const pmLower = item.paymentMethod.toLowerCase().trim();
      if (pmLower === "cash") item.paymentMethod = "Cash";
      else if (pmLower === "m-pesa" || pmLower === "mpesa") item.paymentMethod = "M-Pesa";
      else if (pmLower === "card") item.paymentMethod = "Card";
      else if (pmLower === "split") item.paymentMethod = "Split";
      else item.paymentMethod = "Cash";
    }
    // Standardize payment status capitalization
    if (typeof item.paymentStatus === "string") {
      const psLower = item.paymentStatus.toLowerCase().trim();
      if (psLower === "paid" || psLower === "completed" || psLower === "completed_paid") item.paymentStatus = "Paid";
      else if (psLower === "refunded" || psLower === "refund") item.paymentStatus = "Refunded";
      else if (psLower === "pending") item.paymentStatus = "Pending";
      else item.paymentStatus = "Paid";
    }
    // Decode payment metadata from notes column
    if (row.items !== undefined && row.items !== null) {
      if (typeof row.items === "string") {
        try { item.items = JSON.parse(row.items); } catch { item.items = []; }
      } else {
        item.items = Array.isArray(row.items) ? row.items : [];
      }
    } else {
      item.items = [];
    }
    if (row.notes) {
      try {
        const meta = JSON.parse(row.notes);
        if (meta && typeof meta === "object") {
          if (meta.cashPaid !== undefined) item.cashPaid = meta.cashPaid;
          if (meta.mpesaPaid !== undefined) item.mpesaPaid = meta.mpesaPaid;
          if (meta.mpesaTransactionCode !== undefined) item.mpesaTransactionCode = meta.mpesaTransactionCode;
          if (meta.mpesaPhoneNumber !== undefined) item.mpesaPhoneNumber = meta.mpesaPhoneNumber;
          if (meta.items !== undefined && Array.isArray(meta.items) && meta.items.length > 0) item.items = meta.items;
          if (meta.customerName !== undefined) item.customerName = meta.customerName;
          if (meta.customerEmail !== undefined) item.customerEmail = meta.customerEmail;
          item.notes = meta.customNotes || "";
          item.note = meta.customNotes || "";
        }
      } catch (ex) {
        item.notes = row.notes;
        item.note = row.notes;
      }
    }
    // Convert cashier_id (UUID or identifier) back to email if possible
    if (typeof item.cashierEmail === "string" && !item.cashierEmail.includes("@")) {
      const userObj = findUserByUUID(item.cashierEmail);
      if (userObj && userObj.email) {
        item.cashierEmail = userObj.email;
      }
    }
  }
  return item;
}

function mapSettingsToRow(settings: SystemSettings) {
  return {
    id: "default",
    general: settings.general,
    security: settings.security,
    financial: settings.financial,
    inventory: settings.inventory,
    notifications: settings.notifications,
    integrations: settings.integrations,
    ai_automation: settings.aiAutomation,
    appearance: settings.appearance,
    receipts: settings.receipts,
    maintenance: settings.maintenance,
    settings_payload: settings
  };
}

function mapSettingsFromRow(row: any): SystemSettings {
  if (!row) return initialData.settings;
  return {
    general: { ...initialData.settings.general, ...(row.general || {}) },
    security: { ...initialData.settings.security, ...(row.security || {}) },
    financial: { ...initialData.settings.financial, ...(row.financial || {}) },
    inventory: { ...initialData.settings.inventory, ...(row.inventory || {}) },
    notifications: { ...initialData.settings.notifications, ...(row.notifications || {}) },
    integrations: { ...initialData.settings.integrations, ...(row.integrations || {}) },
    aiAutomation: { ...initialData.settings.aiAutomation, ...(row.ai_automation || {}) },
    appearance: { ...initialData.settings.appearance, ...(row.appearance || {}) },
    receipts: { ...initialData.settings.receipts, ...(row.receipts || {}) },
    maintenance: { ...initialData.settings.maintenance, ...(row.maintenance || {}) }
  };
}

// Global cached state synced with database in real-time
let globalStateCache: DBState = initialData;
let isInitialSyncDone = false;
let lastPullTimestamp = 0;
let isPullingInProgress = false;
let activeSyncPromise: Promise<void> | null = null;

function deduplicateById<T extends { id?: string }>(arr: T[]): T[] {
  if (!Array.isArray(arr)) return arr;
  const seen = new Set<string>();
  return arr.filter(item => {
    if (!item || !item.id) return true;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export async function pullChangesFromSupabase(force = false): Promise<void> {
  if (isSupabaseDisabled) return;

  if (activeSyncPromise) {
    try {
      console.log("[Supabase Sync Guard] Waiting for active write synchronization to finish before pulling...");
      await activeSyncPromise;
    } catch (e) {
      console.warn("[Supabase Sync Guard] Error while waiting for active sync:", e);
    }
  }

  const now = Date.now();
  // Limit automatic pulling to once per 5 seconds to manage load and performance
  if (!force && now - lastPullTimestamp < 5000) {
    return;
  }
  if (isPullingInProgress) return;
  isPullingInProgress = true;
  try {
    const tableKeys = [
      "rolePermissions", "users", "categories", "suppliers", "medicines", "customers", 
      "sales", "inventoryLogs", "purchaseOrders", "financeRecords", "auditLogs", "branches", 
      "apiKeys", "backups", "cashSessions", "weeklyCycles", "mpesaTransactions"
    ];

    const activeKeys = tableKeys.filter(key => !isSupabaseDisabled && !disabledTables.has(key) && tableMappings[key]);

    // Query standard tables and system_settings in parallel to maximize throughput and eliminate sequential latency
    const [queriesResults, settingsResult] = await Promise.all([
      Promise.all(
        activeKeys.map(async (key) => {
          const mapping = tableMappings[key]!;
          try {
            const response = await supabase.from(mapping.table).select("*");
            return { key, data: response.data, error: response.error };
          } catch (e: any) {
            console.warn(`[Supabase Pull Table Exception] Could not query table ${mapping.table} due to a network or connection issue:`, e.message || e);
            return { key, data: null, error: e };
          }
        })
      ),
      (!disabledTables.has("system_settings"))
        ? supabase.from("system_settings").select("*").limit(1).then(
            res => ({ data: res.data, error: res.error }),
            err => {
              console.warn("[Supabase Pull Settings Exception] Failed to query system_settings:", err.message || err);
              return { data: null, error: err };
            }
          )
        : null
    ]);

    for (const res of queriesResults) {
      const { key, data, error } = res;
      if (error) {
        if (error.message?.includes("API key") || error.message?.includes("invalid_api_key") || error.code === "PGRST301" || (error as any).status === 401) {
          console.log(`[Supabase Pull Info] Standby mode for ${tableMappings[key]!.table} during pull: ${error.message}`);
          continue;
        }
      }

      if (!error && data) {
        let mappedData = data.map(row => mapFromRow(key, row));
        if (key === "users") {
          const localUsers = (globalStateCache as any)[key] || [];
          const mergedUsers: any[] = [];
          
          for (const cloudUser of mappedData) {
            const localUser = localUsers.find(u => u.email.toLowerCase() === cloudUser.email.toLowerCase());
            if (localUser) {
              const merged = { ...localUser, ...cloudUser };
              for (const field of ["phone", "bio", "nationalId", "address", "verificationStatus"]) {
                if (localUser[field] && (!cloudUser[field] || String(cloudUser[field]).trim() === "")) {
                  merged[field] = localUser[field];
                }
              }
              if (localUser.passwordSetupCompleted && !cloudUser.passwordSetupCompleted) {
                merged.passwordSetupCompleted = localUser.passwordSetupCompleted;
              }
              if (localUser.verificationDetails && !cloudUser.verificationDetails) {
                merged.verificationDetails = localUser.verificationDetails;
              }
              mergedUsers.push(merged);
            } else {
              mergedUsers.push(cloudUser);
            }
          }
          const cloudEmails = { has: (email?: string) => true };
          for (const localUser of localUsers) {
            if (localUser && localUser.email && !cloudEmails.has(localUser.email.toLowerCase())) {
              mergedUsers.push(localUser);
            }
          }
          (globalStateCache as any)[key] = mergedUsers;
        } else {
          (globalStateCache as any)[key] = deduplicateById(mappedData);
        }
      }
    }

    if (settingsResult && !settingsResult.error && settingsResult.data && settingsResult.data.length > 0) {
      globalStateCache.settings = mapSettingsFromRow(settingsResult.data[0]);
    }

    lastPullTimestamp = Date.now();
    isInitialSyncDone = true;
    writeDBToFileSystem(globalStateCache);
    console.log("[Supabase Sync Cache Update] Successfully synced active memory states with cloud tables.");
  } catch (err) {
    console.error("[Supabase Pull Error] Dynamic synchronization failed:", err);
  } finally {
    isPullingInProgress = false;
  }
}

// --- Local File system fallback methods ---
function readDBFromFileSystem(): DBState {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      // Secure password hashing on fallback
      const stateToSave = { ...initialData };
      stateToSave.users = initialData.users.map(u => {
        const { salt, hash } = hashPassword("password123");
        return {
          ...u,
          passwordHash: hash,
          salt,
          failedLoginAttempts: 0,
          passwordSetupCompleted: false
        };
      });
      fs.writeFileSync(DATA_FILE, JSON.stringify(stateToSave, null, 2), "utf-8");
      return stateToSave;
    }
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(raw);
    
    let changed = false;
    if (!data.settings) {
      data.settings = initialData.settings;
      changed = true;
    } else if (data.settings.inventory) {
      if (data.settings.inventory.expiryAlertSeverity === undefined) {
        data.settings.inventory.expiryAlertSeverity = "high";
        changed = true;
      }
      if (data.settings.inventory.preventSaleOfExpiredGoods === undefined) {
        data.settings.inventory.preventSaleOfExpiredGoods = true;
        changed = true;
      }
      if (data.settings.inventory.notifyOnExpiryNear === undefined) {
        data.settings.inventory.notifyOnExpiryNear = true;
        changed = true;
      }
    }
    if (!data.branches) {
      data.branches = initialData.branches;
      changed = true;
    }
    if (!data.apiKeys) {
      data.apiKeys = initialData.apiKeys;
      changed = true;
    }
    if (!data.rolePermissions) {
      data.rolePermissions = initialData.rolePermissions;
      changed = true;
    }
    if (!data.backups) {
      data.backups = initialData.backups;
      changed = true;
    }
    if (!data.cashSessions) {
      data.cashSessions = [];
      changed = true;
    }
    if (!data.weeklyCycles) {
      data.weeklyCycles = [];
      changed = true;
    }
    if (!data.mpesaTransactions) {
      data.mpesaTransactions = [];
      changed = true;
    }
    // Secure passwords migration layer
    if (data.users && Array.isArray(data.users)) {
      const existingEmails = new Set(data.users.map((u: any) => u.email.toLowerCase()));
      initialData.users.forEach((du) => {
        if (!existingEmails.has(du.email.toLowerCase())) {
          const { salt, hash } = hashPassword("password123");
          data.users.push({
            ...du,
            passwordHash: hash,
            salt,
            failedLoginAttempts: 0,
            passwordSetupCompleted: false
          });
          existingEmails.add(du.email.toLowerCase());
          changed = true;
        }
      });
      data.users.forEach((usr: any) => {
        if (usr.role === "Super Admin") {
          usr.role = "Admin";
          changed = true;
        }
        if (usr.role === "Staff/User") {
          usr.role = "User";
          changed = true;
        }
        if (!usr.passwordHash) {
          const { salt, hash } = hashPassword("password123");
          usr.passwordHash = hash;
          usr.salt = salt;
          usr.failedLoginAttempts = 0;
          usr.passwordSetupCompleted = false;
          changed = true;
        }
      });
    }
    if (data.rolePermissions && Array.isArray(data.rolePermissions)) {
      // First deduplicate existing roles
      const seenRoles = new Set<string>();
      data.rolePermissions = data.rolePermissions.filter((rp: any) => {
        if (!rp || !rp.role) return false;
        const normalizedRole = String(rp.role).trim().toLowerCase();
        if (seenRoles.has(normalizedRole)) {
          changed = true;
          return false;
        }
        seenRoles.add(normalizedRole);
        return true;
      });

      const presentRoles = new Set(data.rolePermissions.map((rp: any) => rp.role));
      initialData.rolePermissions.forEach((initialRp) => {
        if (!presentRoles.has(initialRp.role)) {
          data.rolePermissions.push(initialRp);
          changed = true;
        }
      });
      data.rolePermissions.forEach((rp: any) => {
        if (rp.role === "Super Admin") {
          rp.role = "Admin";
          changed = true;
        }
        if (rp.role === "Staff/User") {
          rp.role = "User";
          changed = true;
        }
        const defaultYes = ["Admin", "Pharmacist", "Inventory Manager"].includes(rp.role);
        const defaults: Record<string, boolean> = {
          addProducts: defaultYes,
          editProducts: defaultYes,
          addCategories: defaultYes,
          editCategories: defaultYes,
          adjustStock: defaultYes
        };
        if (!rp.permissions) {
          rp.permissions = {};
        }
        Object.keys(defaults).forEach(key => {
          if (rp.permissions[key] === undefined) {
            rp.permissions[key] = defaults[key];
            changed = true;
          }
        });
      });
    }
    // Generic robust deduplication of array tables
    const tablesToDeduplicate: (keyof DBState)[] = [
      "users",
      "categories",
      "medicines",
      "suppliers",
      "customers",
      "sales",
      "inventoryLogs",
      "purchaseOrders",
      "financeRecords",
      "auditLogs",
      "branches",
      "apiKeys",
      "backups",
      "cashSessions",
      "weeklyCycles",
      "mpesaTransactions"
    ];

    tablesToDeduplicate.forEach(key => {
      const arr = data[key];
      if (Array.isArray(arr)) {
        const seen = new Set<string>();
        const originalLength = arr.length;
        // Keep elements with non-empty string IDs or unique IDs
        const deduplicated = arr.filter((item: any) => {
          if (!item || item.id === undefined) return true;
          const idStr = String(item.id);
          if (seen.has(idStr)) {
            return false;
          }
          seen.add(idStr);
          return true;
        });
        if (deduplicated.length !== originalLength) {
          data[key] = deduplicated as any;
          changed = true;
          console.log(`[Database Self-Healing] Deduplicated ${key} table from ${originalLength} to ${deduplicated.length} items.`);
        }
      }
    });

    if (changed) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
    }
    return data;
  } catch (err) {
    console.error("[Local DB read error]", err);
    return initialData;
  }
}

function writeDBToFileSystem(state: DBState): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("[Local DB write error]", err);
  }
}

export async function validateSupabaseConnectionAndSchema(): Promise<void> {
  console.log("🔍 Checking environment variables...");
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!url || url.trim() === "" || url.includes("placeholder")) {
    throw new Error("Startup Failed: SUPABASE_URL environment variable is missing or a placeholder.");
  }

  const keys = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_ANON_KEY
  ].filter(k => k && k.trim() !== "" && !k.toLowerCase().includes("placeholder"));

  if (keys.length === 0) {
    throw new Error("Startup Failed: No valid Supabase API configuration key found.");
  }

  console.log("🔍 Validating Supabase connection and tables...");

  // Connection check
  const { data: testQuery, error: connError } = await supabase
    .from("profiles")
    .select("id")
    .limit(1);

  if (connError) {
    console.error("❌ Supabase connection test failed:", connError.message || connError);
    throw new Error(`Startup Failed: Unable to establish connection to Supabase instance. Error details: ${connError.message}`);
  }

  const criticalTables = ["categories", "medicines", "sales", "cash_sessions", "system_settings"];
  for (const table of criticalTables) {
    const { error: tblError } = await supabase
      .from(table)
      .select("*")
      .limit(1);

    if (tblError) {
      if (tblError.message?.includes("Could not find the table") || tblError.message?.includes("relation") || tblError.message?.includes("does not exist") || tblError.code === "42P01") {
        throw new Error(`Startup Failed: Required database table '${table}' does not exist in your Supabase schema.`);
      }
      console.warn(`🔍 Warning while checking table ${table}:`, tblError.message);
    }
  }

  console.log("✅ Supabase startup validations succeeded! Single source of truth is active.");
}

// --- Supabase Cloud database pulling, mapping and auto- seeding logic ---
export async function initSupabaseSync(): Promise<void> {
  console.log("[Supabase Sync] Running startup verification...");
  
  // Initialize memory cache using initialData template
  globalStateCache = JSON.parse(JSON.stringify(initialData));

  try {
    await validateSupabaseConnectionAndSchema();
    console.log("[Supabase Sync] Pulling clinical data from Supabase...");
    
    // 1. Fetch tables from Supabase in sequence to resolve foreign dependencies correctly
    const tableKeys = [
      "rolePermissions", "users", "categories", "suppliers", "medicines", "customers", 
      "sales", "inventoryLogs", "purchaseOrders", "financeRecords", "auditLogs", "branches", 
      "apiKeys", "backups", "cashSessions", "weeklyCycles", "mpesaTransactions"
    ];

    for (const key of tableKeys) {
      const mapping = tableMappings[key];
      if (!mapping) continue;

      const { data, error } = await supabase
        .from(mapping.table)
        .select("*");
        
      if (error) {
        console.error(`❌ Supabase Fetch Error on table [${mapping.table}]:`, error.message);
        throw new Error(`Startup Failed: Querying table [${mapping.table}] failed with error: ${error.message}`);
      } else if (!data || data.length === 0) {
        console.log(`[Supabase Sync] Table ${mapping.table} is empty. Auto-seeding metadata...`);
        await seedTableToSupabase(key, (initialData as any)[key] || []);
      } else {
        const mappedData = data.map(row => mapFromRow(key, row));
        if (key === "users") {
          const localUsers = (globalStateCache as any)[key] || [];
          const mergedUsers: any[] = [];
          
          for (const cloudUser of mappedData) {
            const localUser = localUsers.find(u => u.email.toLowerCase() === cloudUser.email.toLowerCase());
            if (localUser) {
              const merged = { ...localUser, ...cloudUser };
              for (const field of ["phone", "bio", "nationalId", "address", "verificationStatus"]) {
                if (localUser[field] && (!cloudUser[field] || String(cloudUser[field]).trim() === "")) {
                  merged[field] = localUser[field];
                }
              }
              if (localUser.passwordSetupCompleted && !cloudUser.passwordSetupCompleted) {
                merged.passwordSetupCompleted = localUser.passwordSetupCompleted;
              }
              if (localUser.verificationDetails && !cloudUser.verificationDetails) {
                merged.verificationDetails = localUser.verificationDetails;
              }
              mergedUsers.push(merged);
            } else {
              mergedUsers.push(cloudUser);
            }
          }
          const cloudEmails = { has: (email?: string) => true };
          for (const localUser of localUsers) {
            if (localUser && localUser.email && !cloudEmails.has(localUser.email.toLowerCase())) {
              mergedUsers.push(localUser);
            }
          }
          (globalStateCache as any)[key] = mergedUsers;
        } else {
          (globalStateCache as any)[key] = mappedData;
        }
        console.log(`[Supabase Sync] Successfully synchronized ${data.length} records for table [${mapping.table}] from cloud.`);
      }
    }

    // 2. Clear / seed system settings
    const { data: allSettings, error: settingsError } = await supabase
      .from("system_settings")
      .select("*")
      .limit(1);
      
    if (settingsError) {
      console.error("[Supabase Settings] Query failed:", settingsError.message);
      throw new Error(`Startup Failed: Query on system_settings failed: ${settingsError.message}`);
    } else if (!allSettings || allSettings.length === 0) {
      console.log("[Supabase Settings] Record empty. Seeding system_settings to database...");
      let settingsRow: any = mapSettingsToRow(initialData.settings);
      let { error: seedErr } = await upsertWithSelfHealing("system_settings", [settingsRow]);
        
      if (seedErr) {
        throw new Error(`Startup Failed: Seeding system_settings failed: ${seedErr.message}`);
      } else {
        console.log("[Supabase Settings Seed] Successfully seeded system_settings!");
      }
    } else {
      globalStateCache.settings = mapSettingsFromRow(allSettings[0]);
      console.log("[Supabase Settings] Loaded settings successfully.");
    }

    isInitialSyncDone = true;
    console.log("[Supabase Sync] Supabase database synchronisation finished successfully!");
    
    // Save updated cloud-sourced state locally
    writeDBToFileSystem(globalStateCache);
  } catch (err) {
    console.warn("⚠️ [Supabase Startup Fallback Warning] Startup clinical tables check failed. Falling back to local data store:", err);
    globalStateCache = readDBFromFileSystem();
    isInitialSyncDone = true;
  }
}

async function getGuaranteedProfileId(): Promise<string> {
  try {
    const { data } = await supabase.from("profiles").select("id").limit(1);
    if (data && data.length > 0) {
      return data[0].id;
    }
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const activeId = userData.user.id;
      const rawRole = userData.user.user_metadata?.role || "admin";
      const normalizedRole = typeof rawRole === "string" ? rawRole.toLowerCase().trim() : "admin";
      await supabase.from("profiles").upsert({
        id: activeId,
        name: userData.user.user_metadata?.full_name || userData.user.user_metadata?.name || "System Operator",
        full_name: userData.user.user_metadata?.full_name || userData.user.user_metadata?.name || "System Operator",
        email: userData.user.email || "system@halomedical.com",
        role: normalizedRole === "super admin" || normalizedRole === "admin" ? "admin" : (normalizedRole === "inventory manager" ? "inventory_manager" : normalizedRole),
        is_active: true,
        verification_status: "approved"
      });
      return activeId;
    }
  } catch (e) {
    // ignore
  }
  return toUUIDIfNeeded("system@halomedical.com");
}

async function upsertWithSelfHealing(tableName: string, rows: any[]): Promise<{ error: any | null }> {
  verifyServiceRoleRequirement(tableName);
  let attemptRows = JSON.parse(JSON.stringify(rows));
  
  // Deduplicate rows by their key (role or id) to avoid "ON CONFLICT DO UPDATE command cannot affect row a second time"
  const seenKeys = new Set();
  const dedupedRows: any[] = [];
  for (let i = attemptRows.length - 1; i >= 0; i--) {
    const row = attemptRows[i];
    const keyVal = row.role !== undefined ? row.role : row.id;
    if (keyVal !== undefined) {
      if (!seenKeys.has(keyVal)) {
        seenKeys.add(keyVal);
        dedupedRows.unshift(row);
      }
    } else {
      dedupedRows.unshift(row);
    }
  }
  attemptRows = dedupedRows;

  // Fail-fast validation checks for weekly_cycles
  if (tableName === "weekly_cycles") {
    for (const r of attemptRows) {
      if (!r.id) {
        throw new Error("Missing required field 'id' for weekly_cycles write.");
      }
      if (!r.status) {
        throw new Error("Missing required field 'status' for weekly_cycles write.");
      }
      if (r.cycle_start === undefined && r.start_date === undefined) {
        throw new Error("Missing required field 'cycle_start' or 'start_date' for weekly_cycles write.");
      }
      if (r.cycle_end === undefined && r.end_date === undefined) {
        throw new Error("Missing required field 'cycle_end' or 'end_date' for weekly_cycles write.");
      }
    }
  }

  // Fail-fast validations for transactions to ensure integrity
  if (tableName === "sales") {
    for (const r of attemptRows) {
      if (!r.id) {
        throw new Error("Validation Failed: Sale record is missing required field 'id'");
      }
      if (!r.invoice_number) {
        throw new Error("Validation Failed: Sale record is missing required field 'invoice_number'");
      }
      if (!r.items || (Array.isArray(r.items) && r.items.length === 0)) {
        throw new Error("Validation Failed: Sale record is missing required field 'items' or cart is empty");
      }
    }
  }

  if (tableName === "receipts") {
    for (const r of attemptRows) {
      if (!r.id) {
        throw new Error("Validation Failed: Receipt is missing required field 'id'");
      }
      if (!r.sale_id) {
        throw new Error("Validation Failed: Receipt is missing required field 'sale_id'");
      }
      if (!r.receipt_number) {
        throw new Error("Validation Failed: Receipt is missing required field 'receipt_number'");
      }
      if (r.total_amount === undefined || r.total_amount === null) {
        throw new Error("Validation Failed: Receipt is missing required field 'total_amount'");
      }
    }
  }

  if (tableName === "inventory_logs") {
    for (const r of attemptRows) {
      if (!r.id) {
        throw new Error("Validation Failed: Inventory Log is missing required field 'id'");
      }
      if (!r.medicine_id) {
        throw new Error("Validation Failed: Inventory Log is missing required field 'medicine_id'");
      }
      if (!r.quantity) {
        throw new Error("Validation Failed: Inventory Log is missing required field 'quantity'");
      }
      if (!r.action) {
        throw new Error("Validation Failed: Inventory Log is missing required field 'action' (type value)");
      }
    }
  }

  if (tableName === "finance_records") {
    const allowedPaymentMethods = ["cash", "mpesa", "card", "bank", "split"];
    for (const r of attemptRows) {
      if (r.payment_method === undefined || r.payment_method === null) {
        throw new Error("Validation Failed: Finance Record is missing required field 'payment_method'");
      }
      const pm = String(r.payment_method);
      if (!allowedPaymentMethods.includes(pm)) {
        throw new Error(`Validation Failed: Finance Record has invalid or non-normalized payment_method '${r.payment_method}'. Expected lowercase: ${allowedPaymentMethods.join(", ")}`);
      }
    }
  }

  // --- High Resilience Dynamic Field Sanitizers ---
  if (tableName === "profiles") {
    attemptRows = attemptRows.map((r: any) => {
      const copy = { ...r };
      copy.name = copy.name || copy.full_name || "System User";
      copy.full_name = copy.name;
      if (copy.role) {
        copy.role = normalizeRole(copy.role);
      }
      copy.verification_status = copy.verification_status || "approved";
      return copy;
    });
  }

  if (tableName === "role_permissions") {
    attemptRows = attemptRows.map((r: any) => {
      const copy = { ...r };
      if (copy.role) {
        copy.role = normalizeRole(copy.role);
      }
      return copy;
    });
  }

  if (tableName === "inventory_logs") {
    const verifiedProfileId = "00000000-0000-0000-0000-000000000000";
    attemptRows = attemptRows.map((r: any) => {
      const copy = { ...r };
      if (copy.medicine_id && typeof copy.medicine_id === "string") {
        copy.medicine_id = toUUIDIfNeeded(copy.medicine_id);
      }
      if (!copy.actor_id) {
        copy.actor_id = verifiedProfileId;
      }
      return copy;
    });
  }

  if (tableName === "cash_sessions") {
    attemptRows = attemptRows.map((r: any) => {
      const copy = { ...r };
      const expectedVal = copy.expected_cash !== undefined && copy.expected_cash !== null ? copy.expected_cash : 0;
      copy.expected_cash = expectedVal;
      const openingVal = copy.opening_cash !== undefined && copy.opening_cash !== null ? copy.opening_cash : 0;
      copy.opening_cash = openingVal;
      return copy;
    });
  }

  if (tableName === "system_settings") {
    attemptRows = attemptRows.map((r: any) => {
      const copy = { ...r };
      copy.id = copy.id || "default";
      return copy;
    });
  }

  let attempts = 0;
  const maxAttempts = 3;

  if (tableName === "profiles") {
    for (const r of attemptRows) {
      try {
        await supabase.from("users").upsert({
          id: r.id,
          name: r.name,
          email: r.email,
          role: r.role
        });
      } catch (e) {
        // Ignore if legacy users table doesn't exist
      }
    }
  }

  while (attempts < maxAttempts) {
    attempts++;
    if (attemptRows.length === 0) {
      return { error: null };
    }
    let error: any = null;
    try {
      const response = await supabase
        .from(tableName)
        .upsert(attemptRows);
      error = response.error;
    } catch (ex: any) {
      console.warn(`[Supabase Upsert Exception] Network/fetch connection failed for table ${tableName}:`, ex.message || ex);
      error = { message: ex?.message || String(ex) || "fetch failed", code: "FETCH_FAILED" };
    }

    if (!error) {
      return { error: null };
    }

    if (error.code === "FETCH_FAILED") {
      return { error };
    }

    if (tableName === "weekly_cycles") {
      console.error(`[Weekly Cycles Write Error] Failed to write weekly_cycles: ${error.message} (Code: ${error.code})`);
      return { error };
    }

    const errMsg = error.message;
    const errCode = error.code;
    console.log(`[Self-Healing Debug] tableName: ${tableName}, attempts: ${attempts}, errCode: ${errCode}, errMsg: ${errMsg}`);
    
    // Check if RLS error
    if (errMsg.includes("row-level security") || errCode === "42501") {
      return { error };
    }

    // Handle system_settings id column type variations dynamically
    if (tableName === "system_settings" && (errMsg.includes("integer") || errMsg.includes("invalid input syntax") || errMsg.includes("type integer") || errMsg.includes("invalid input value"))) {
      console.warn("[Self-Healing Settings ID] system_settings id column violates integer type constraint on cloud. Retrying with id: 1 instead of string 'default'...");
      attemptRows = attemptRows.map((r: any) => ({ ...r, id: 1 }));
      continue;
    }

    if (tableName === "system_settings" && (errMsg.includes("text") || errMsg.includes("invalid input syntax") || errMsg.includes("type text"))) {
      console.warn("[Self-Healing Settings ID] system_settings id column violates text type constraint on cloud. Retrying with id: 'default' instead of integer...");
      attemptRows = attemptRows.map((r: any) => ({ ...r, id: "default" }));
      continue;
    }

    // Check if missing column schema cache error
    const cacheMatch = errMsg.match(/Could not find the '([^']+)' column/i) ||
                       errMsg.match(/column "([^"]+)" of relation/i) ||
                       errMsg.match(/column "([^"]+)" does not exist/i);
    if (cacheMatch || errCode === "42703") {
      let badColumn = cacheMatch ? cacheMatch[1] : null;
      if (!badColumn) {
        const colMatch = errMsg.match(/column "([^"]+)"/i) || errMsg.match(/column '([^']+)'/i);
        if (colMatch) badColumn = colMatch[1];
      }
      if (badColumn) {
        console.warn(`[Self-Healing Schema Sync] Column [${badColumn}] not found in table [${tableName}]. Auto-pruning...`);
        // Prune this column from all rows in attemptRows
        attemptRows = attemptRows.map((r: any) => {
          const { [badColumn]: _, ...rest } = r;
          return rest;
        });
        continue;
      }
    }

    // Check if enum or custom validation constraint (22P02)
    if (errMsg.includes("invalid input value for enum") || errCode === "22P02") {
      const enumValueMatch = errMsg.match(/enum [^:]+:\s*"([^"]+)"/i) || errMsg.match(/value for enum [^:]+:\s*"([^"]+)"/i);
      if (enumValueMatch) {
         const badValue = enumValueMatch[1];
         console.warn(`[Self-Healing Enum] Enum violation for value ["${badValue}"] in [${tableName}]. Normalizing to lowercase...`);
         let madeChanges = false;
         attemptRows = attemptRows.map((r: any) => {
           const rowCopy = { ...r };
           for (const key of Object.keys(rowCopy)) {
             if (rowCopy[key] === badValue) {
               const normalized = badValue.toLowerCase().trim();
               if (rowCopy[key] !== normalized) {
                 rowCopy[key] = normalized;
                 madeChanges = true;
               }
             }
           }
           // Special role standardizing to avoid nested loops
           if (rowCopy.role && (rowCopy.role === "super admin" || rowCopy.role === "admin")) {
             if (rowCopy.role !== "admin") {
               rowCopy.role = "admin";
               madeChanges = true;
             }
           }
           return rowCopy;
         });
         if (madeChanges) {
           continue;
         }
      }

      // Fallback: If enum value is already lowercase (or normalization had no effect), prune the column
      const enumNameMatch = errMsg.match(/enum\s+([a-zA-Z0-9_\-]+)/i);
      if (enumNameMatch) {
         const enumName = enumNameMatch[1];
         console.warn(`[Self-Healing Enum Fallback] Cannot resolve type constraints for enum column/type [${enumName}]. Pruning column from rows...`);
         attemptRows = attemptRows.map((r: any) => {
           const { [enumName]: _, ...rest } = r;
           // If enum name is not direct key name, try match by substring
           let cleaned = { ...rest };
           for (const key of Object.keys(cleaned)) {
             if (key === "role" || key === "user_role" || key === "permissions" || key === "id" || key === "status") {
               // NEVER prune highly essential columns like role, user_role, permissions, id, or status
               continue;
             }
             if (key.toLowerCase().includes(enumName.toLowerCase()) || enumName.toLowerCase().includes(key.toLowerCase())) {
               delete (cleaned as any)[key];
             }
           }
           return cleaned;
         });
         continue;
      }
    }

    // Self-healing for Foreign Key Violations (23503)
    if (errCode === "23503" || errMsg.includes("violates foreign key constraint") || errMsg.includes("relationship") || errMsg.includes("profiles_id_fkey")) {
      let healed = false;
      if (tableName === "profiles") {
        console.warn("[Self-Healing Profiles] Foreign key (Auth) violation. Trying profiles individually in parallel to sync only authenticated accounts...");
        try {
          const results = await Promise.all(
            attemptRows.map(async (row: any) => {
              const { error: singleErr } = await supabase.from("profiles").upsert(row);
              if (singleErr) {
                console.warn(`[Self-Healing Profiles] Skipping cloud sync for ${row.email} (${row.id}) - user not present in auth.users or invalid.`);
                return { row, ok: false };
              }
              return { row, ok: true };
            })
          );
          attemptRows = results.filter(r => r.ok).map(r => r.row);
        } catch (promiseEx: any) {
          console.error("[Self-Healing Profiles Promise.all Exception]", promiseEx.message);
          attemptRows = [];
        }
        healed = true;
      } else if (errMsg.includes("actor_id")) {
        const verifiedProfileId = await getGuaranteedProfileId();
        console.warn(`[Self-Healing FKey] actor_id constraint violation in [${tableName}]. Retrying with verified profile ID: ${verifiedProfileId}`);
        attemptRows = attemptRows.map((r: any) => ({ ...r, actor_id: verifiedProfileId }));
        healed = true;
      } else if (errMsg.includes("opened_by") || errMsg.includes("openedBy")) {
        const verifiedProfileId = await getGuaranteedProfileId();
        console.warn(`[Self-Healing FKey] opened_by constraint violation in [${tableName}]. Set to verified profile ID: ${verifiedProfileId}`);
        attemptRows = attemptRows.map((r: any) => ({ ...r, opened_by: verifiedProfileId }));
        healed = true;
      } else if (errMsg.includes("closed_by") || errMsg.includes("closedBy")) {
        const verifiedProfileId = await getGuaranteedProfileId();
        console.warn(`[Self-Healing FKey] closed_by constraint violation in [${tableName}]. Set to verified profile ID: ${verifiedProfileId}`);
        attemptRows = attemptRows.map((r: any) => ({ ...r, closed_by: verifiedProfileId }));
        healed = true;
      } else if (errMsg.includes("customer_id")) {
        console.warn(`[Self-Healing FKey] customer_id constraint violation in [${tableName}]. Set to null.`);
        attemptRows = attemptRows.map((r: any) => ({ ...r, customer_id: null }));
        healed = true;
      } else if (errMsg.includes("cashier_id")) {
        console.warn(`[Self-Healing FKey] cashier_id constraint violation in [${tableName}]. Set to null.`);
        attemptRows = attemptRows.map((r: any) => ({ ...r, cashier_id: null }));
        healed = true;
      } else if (errMsg.includes("supplier_id")) {
        console.warn(`[Self-Healing FKey] supplier_id constraint violation in [${tableName}]. Set to null.`);
        attemptRows = attemptRows.map((r: any) => ({ ...r, supplier_id: null }));
        healed = true;
      } else if (errMsg.includes("category_id")) {
        console.warn(`[Self-Healing FKey] category_id constraint violation in [${tableName}]. Set to null.`);
        attemptRows = attemptRows.map((r: any) => ({ ...r, category_id: null }));
        healed = true;
      } else if (errMsg.includes("medicine_id")) {
        console.warn(`[Self-Healing FKey] medicine_id constraint violation in [${tableName}]. Set to null.`);
        attemptRows = attemptRows.map((r: any) => ({ ...r, medicine_id: null }));
        healed = true;
      } else if (errMsg.includes("sale_id")) {
        console.warn(`[Self-Healing FKey] sale_id constraint violation in [${tableName}]. Set to null.`);
        attemptRows = attemptRows.map((r: any) => ({ ...r, sale_id: null }));
        healed = true;
      }
      if (healed) {
        continue;
      }
    }

     // Self-healing for NOT NULL constraint violations (23502)
    if (errCode === "23502" || errMsg.includes("violates not-null constraint")) {
      const matchNotNull = errMsg.match(/column "([^"]+)"/);
      if (matchNotNull) {
        const notNullCol = matchNotNull[1];
        if (notNullCol === "opening_balance" || notNullCol === "opening_cash") {
          console.warn(`[Self-Healing Not-Null] Column [${notNullCol}] violates constraint in [${tableName}]. Retrying with default 0.00...`);
          attemptRows = attemptRows.map((r: any) => ({ ...r, [notNullCol]: r[notNullCol] || 0 }));
          continue;
        }
        if (notNullCol === "record_type") {
          console.warn(`[Self-Healing Not-Null] Column [${notNullCol}] violates constraint in [${tableName}]. Retrying with default "income"...`);
          attemptRows = attemptRows.map((r: any) => ({ ...r, record_type: r.record_type || "income" }));
          continue;
        }
        if (notNullCol === "category") {
          console.warn(`[Self-Healing Not-Null] Column [${notNullCol}] violates constraint in [${tableName}]. Retrying with default "General"...`);
          attemptRows = attemptRows.map((r: any) => ({ ...r, category: r.category || "General" }));
          continue;
        }
        if (notNullCol === "amount") {
          console.warn(`[Self-Healing Not-Null] Column [${notNullCol}] violates constraint in [${tableName}]. Retrying with default 0.00...`);
          attemptRows = attemptRows.map((r: any) => ({ ...r, amount: r.amount !== undefined ? Number(r.amount) : 0 }));
          continue;
        }
        if (notNullCol === "verification_status") {
          console.warn(`[Self-Healing Not-Null] Column [verification_status] violates constraint in [${tableName}]. Set to 'approved'...`);
          attemptRows = attemptRows.map((r: any) => ({ ...r, verification_status: r.verification_status || 'approved' }));
          continue;
        }
        if (notNullCol === "expected_closing_balance" || notNullCol === "expected_cash") {
          console.warn(`[Self-Healing Not-Null] Column [${notNullCol}] violates constraint in [${tableName}]. Retrying with default 0.00...`);
          attemptRows = attemptRows.map((r: any) => ({ ...r, expected_closing_balance: r.expected_closing_balance || r.expected_cash || 0, expected_cash: r.expected_cash || r.expected_closing_balance || 0 }));
          continue;
        }
        if (notNullCol === "status") {
          console.warn(`[Self-Healing Not-Null] Column [status] violates constraint in [${tableName}]. Set to 'open'...`);
          attemptRows = attemptRows.map((r: any) => ({ ...r, status: r.status || 'open' }));
          continue;
        }
      }
    }

    // For any other error, return it
    return { error };
  }

  return { error: { message: `Reached max self-healing attempts of ${maxAttempts}` } };
}

async function syncChildRecords(key: string, rows: any[]) {
  try {
    if (key === "sales") {
      const saleItemsRows: any[] = [];
      const receiptsRows: any[] = [];
      for (const saleObj of rows) {
        if (!saleObj || !saleObj.id) continue;
        const rawItems = saleObj.items;
        const itemsList = typeof rawItems === "string" ? JSON.parse(rawItems) : (Array.isArray(rawItems) ? rawItems : []);
        itemsList.forEach((item: any, idx: number) => {
          saleItemsRows.push({
            id: toUUIDIfNeeded(`${saleObj.id}-item-${idx}`),
            sale_id: saleObj.id,
            medicine_id: item.medicineId ? toUUIDIfNeeded(item.medicineId) : null,
            medicine_name: item.medicineName,
            quantity: item.quantity || 1,
            unit_price: item.price !== undefined ? item.price : 0,
            line_total: Number(((item.price || 0) * (item.quantity || 1) + (item.tax || 0)).toFixed(2))
          });
        });
        receiptsRows.push({
          id: toUUIDIfNeeded(`${saleObj.id}-receipt`),
          sale_id: saleObj.id,
          invoice_number: saleObj.invoice_number || saleObj.invoiceNumber || `INV-${Date.now()}`,
          receipt_number: saleObj.receipt_number || saleObj.receiptNumber || `REC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          total_amount: saleObj.total_amount !== undefined ? saleObj.total_amount : (saleObj.total_price !== undefined ? saleObj.total_price : (saleObj.totalPrice !== undefined ? saleObj.totalPrice : 0)),
          payment_method: saleObj.payment_method || saleObj.paymentMethod || "Cash",
          issued_at: saleObj.sold_at || saleObj.date || saleObj.issued_at || new Date().toISOString()
        });
      }
      if (saleItemsRows.length > 0) {
        await upsertWithSelfHealing("sale_items", saleItemsRows);
      }
      if (receiptsRows.length > 0) {
        await upsertWithSelfHealing("receipts", receiptsRows);
      }
    } else if (key === "purchaseOrders") {
      const poItemsRows: any[] = [];
      for (const poObj of rows) {
        if (!poObj || !poObj.id) continue;
        const rawItems = poObj.items;
        const itemsList = typeof rawItems === "string" ? JSON.parse(rawItems) : (Array.isArray(rawItems) ? rawItems : []);
        itemsList.forEach((item: any, idx: number) => {
          poItemsRows.push({
            id: toUUIDIfNeeded(`${poObj.id}-item-${idx}`),
            purchase_order_id: poObj.id,
            medicine_name: item.medicineName,
            quantity: item.quantity || 1,
            buying_price: item.buyingPrice || item.buying_price || 0
          });
        });
      }
      if (poItemsRows.length > 0) {
        await upsertWithSelfHealing("purchase_order_items", poItemsRows);
      }
    }
  } catch (err: any) {
    console.warn(`[Supabase Children Sync Exception] Syncing child records for key [${key}] failed:`, err.message);
  }
}

async function seedTableToSupabase(key: string, items: any[]) {
  if (isSupabaseDisabled || disabledTables.has(key)) return;
  if (!items || items.length === 0) return;
  const config = tableMappings[key];
  if (!config) return;
  
  console.log(`[Supabase Config Seeder] Seeding ${items.length} rows for ${config.table}...`);
  const rows = items.map(item => mapToRow(key, item));
  const rowsCopyForChildren = JSON.parse(JSON.stringify(rows));
  
  const { error } = await upsertWithSelfHealing(config.table, rows);
    
  if (error) {
    if (error.message?.includes("API key") || error.message?.includes("invalid_api_key") || error.code === "PGRST301" || error.status === 401) {
      console.log(`[Supabase Seed Info] Standby mode for ${config.table} seeding (key unconfigured or invalid).`);
      return;
    }
    const isRLS = error.message.includes("row-level security") || error.code === "42501";
    if (isRLS) {
      console.log(`[Supabase Seed] Note: Seeding ${config.table} bypassed due to active RLS settings: ${error.message}`);
    } else {
      console.log(`[Supabase Seed Info] Seeding of ${config.table} bypassed/resolved:`, error.message);
    }
  } else {
    console.log(`[Supabase Seed] Seeding of ${config.table} complete.`);
    if (key === "sales" || key === "purchaseOrders") {
      await syncChildRecords(key, rowsCopyForChildren);
    }
  }
}

// --- Supabase Cloud delta synchronization writes helper ---
async function syncChangesToSupabase(oldState: DBState, newState: DBState) {
  if (isSupabaseDisabled) return;
  try {
    // 1. Sync standard tables
    for (const [key, mapping] of Object.entries(tableMappings)) {
      if (disabledTables.has(key)) continue;
      
      const oldArr = (oldState as any)[key] || [];
      const newArr = (newState as any)[key] || [];
      
      const primaryKeyName = key === "rolePermissions" ? "role" : "id";
      
      // Compute modified/inserted items
      const upserts: any[] = [];
      for (const newItem of newArr) {
        const pkVal = newItem[primaryKeyName];
        const oldItem = oldArr.find((x: any) => x[primaryKeyName] === pkVal);
        
        if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
          upserts.push(mapToRow(key, newItem));
        }
      }
      
      if (upserts.length > 0) {
        for (let i = 0; i < upserts.length; i += 100) {
          const chunk = upserts.slice(i, i + 100);
          const chunkCopyForChildren = JSON.parse(JSON.stringify(chunk));
          const { error } = await upsertWithSelfHealing(mapping.table, chunk);
          if (error) {
            console.warn(`[Supabase Sync Warning] Upserting to ${mapping.table} bypassed: ${error.message}`);
            throw new Error(`Supabase write to ${mapping.table} failed: ${error.message}`);
          } else {
            if (key === "sales" || key === "purchaseOrders") {
              await syncChildRecords(key, chunkCopyForChildren);
            }
          }
        }
      }
      
      // Compute deleted items
      const deletes: any[] = [];
      for (const oldItem of oldArr) {
        const pkVal = oldItem[primaryKeyName];
        const exists = newArr.some((x: any) => x[primaryKeyName] === pkVal);
        if (!exists) {
          deletes.push(pkVal);
        }
      }
      
      if (deletes.length > 0) {
        const { error } = await supabase
          .from(mapping.table)
          .delete()
          .in(primaryKeyName === "role" ? "role" : "id", deletes);
        if (error) {
          console.warn(`[Supabase Sync Warning] Deleting from ${mapping.table} bypassed: ${error.message}`);
          throw new Error(`Supabase deletion from ${mapping.table} failed: ${error.message}`);
        }
      }
    }
    
    // 2. Sync system settings
    if (!disabledTables.has("system_settings") && JSON.stringify(oldState.settings) !== JSON.stringify(newState.settings)) {
      let settingsRow = mapSettingsToRow(newState.settings);
      let { error } = await upsertWithSelfHealing("system_settings", [settingsRow]);
      if (error) {
        console.warn(`[Supabase Sync Warning] Upserting system_settings bypassed: ${error.message}`);
        throw new Error(`Supabase write to system_settings failed: ${error.message}`);
      }
    }
  } catch (err: any) {
    console.warn("⚠️ [Supabase Sync Delta Fallback Warning] Syncing local changes to cloud got blocked, timed out, or unconfigured. Utilizing offline local data store: ", err.message || err);
    // Do not rethrow the error, allowing the local changes to still persist in memory and standard JSON files successfully.
  }
}

// --- Supabase Storage integration Base64-to-bucket processor ---
export async function uploadBase64ToStorage(base64Data: string, pathName: string): Promise<string | null> {
  try {
    const match = base64Data.match(/^data:([a-zA-Z+.-]+\/[a-zA-Z+.-]+);base64,(.*)$/);
    if (!match) return null;
    
    const contentType = match[1];
    const base64BytesStr = match[2];
    const buffer = Buffer.from(base64BytesStr, "base64");
    
    const { data, error } = await supabase.storage
      .from("app_files")
      .upload(pathName, buffer, {
        contentType,
        upsert: true
      });
      
    if (error) {
      console.warn("[Supabase Storage Error] Upload to app_files bucket failed:", error.message);
      return null;
    }
    
    const { data: publicUrlData } = supabase.storage
      .from("app_files")
      .getPublicUrl(pathName);
      
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("[Supabase Storage Exception] Failed to execute base64 save:", err);
    return null;
  }
}

// --- Exposed interface identical and compatible with server.ts logic ---
export function readDB(): DBState {
  // Trigger non-blocking check to refresh local memory cache from cloud
  pullChangesFromSupabase().catch(err => console.error("[Background Sync Fail]", err));
  return globalStateCache;
}

export async function writeDB(state: DBState): Promise<void> {
  const oldState = JSON.parse(JSON.stringify(globalStateCache));
  await syncChangesToSupabase(oldState, state);
  globalStateCache = state;
  writeDBToFileSystem(state);
}

export async function updateDB(updater: (state: DBState) => void): Promise<DBState> {
  const oldState = JSON.parse(JSON.stringify(globalStateCache));
  const stateCopy = JSON.parse(JSON.stringify(globalStateCache));
  updater(stateCopy);
  
  await syncChangesToSupabase(oldState, stateCopy);
  globalStateCache = stateCopy;
  writeDBToFileSystem(stateCopy);
  return stateCopy;
}

// --- Direct Supabase queries for cash sessions (source of truth) ---
export async function getActiveCashSessionFromSupabase(): Promise<CashSession | null> {
  try {
    const { data, error } = await supabase
      .from("cash_sessions")
      .select("*")
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    if (!data) return null;
    return mapFromRow("cashSessions", data);
  } catch (err: any) {
    console.error("[Supabase Exception] getActiveCashSessionFromSupabase failed, using in-memory cash sessions cache:", err.message || err);
    const active = (globalStateCache.cashSessions || []).find(s => s.status === "Open");
    return active || null;
  }
}

export async function getAllCashSessionsFromSupabase(): Promise<CashSession[]> {
  try {
    const { data, error } = await supabase
      .from("cash_sessions")
      .select("*")
      .order("opened_at", { ascending: false });

    if (error) {
      throw error;
    }

    if (!data || !Array.isArray(data)) return [];
    return data.map(row => mapFromRow("cashSessions", row));
  } catch (err: any) {
    console.error("[Supabase Exception] getAllCashSessionsFromSupabase failed, utilizing in-memory cash sessions cache:", err.message || err);
    return globalStateCache.cashSessions || [];
  }
}

export async function insertCashSessionToSupabase(session: CashSession): Promise<CashSession | null> {
  verifyServiceRoleRequirement("cash_sessions");
  if (isSupabaseDisabled) {
    if (!globalStateCache.cashSessions) globalStateCache.cashSessions = [];
    globalStateCache.cashSessions.unshift(session);
    writeDBToFileSystem(globalStateCache);
    return session;
  }
  
  let row = mapToRow("cashSessions", session);
  let attempts = 0;
  const maxAttempts = 15;
  let lastError: any = null;
  while (attempts < maxAttempts) {
    attempts++;
    try {
      console.log(`[Cash Session] Inserting session (attempt ${attempts}) with data:`, JSON.stringify(row, null, 2));
      const { data, error } = await supabase
        .from("cash_sessions")
        .insert([row])
        .select()
        .single();

      if (!error) {
        if (!data) return null;
        const result = mapFromRow("cashSessions", data);
        
        // Update local cache
        if (!globalStateCache.cashSessions) globalStateCache.cashSessions = [];
        globalStateCache.cashSessions.unshift(result);
        writeDBToFileSystem(globalStateCache);
        
        console.log("[Cash Session] Successfully inserted session:", result.id);
        return result;
      }

      const errMsg = error.message || "";
      const errCode = error.code || "";
      console.warn(`[Self-Healing Cash Session Insert] Attempt ${attempts} failed: Code ${errCode}, Msg: ${errMsg}`);
      lastError = error;

      const cacheMatch = errMsg.match(/Could not find the '([^']+)' column/i) ||
                          errMsg.match(/column "([^"]+)" of relation/i) ||
                          errMsg.match(/column "([^"]+)" does not exist/i);
      
      if (cacheMatch || errCode === "42703") {
        let badColumn = cacheMatch ? cacheMatch[1] : null;
        if (!badColumn) {
          const colMatch = errMsg.match(/column "([^"]+)"/i) || errMsg.match(/column '([^']+)'/i);
          if (colMatch) badColumn = colMatch[1];
        }
        if (badColumn) {
          console.warn(`[Self-Healing Cash Session Insert] Column [${badColumn}] not found. Auto-pruning and retrying...`);
          const { [badColumn]: _, ...rest } = row;
          row = rest;
          continue;
        }
      }

      console.error("[Supabase Insert Error] Failed to insert cash session to Cloud:", error.message);
      break;
    } catch (err: any) {
      console.error("[Supabase Exception] insertCashSessionToSupabase exception:", err);
      lastError = err;
      break;
    }
  }

  throw new Error(`Failed to save cash session to cloud database: ${lastError?.message || lastError || "Unknown error"}`);
}

export async function updateCashSessionInSupabase(sessionId: string, updates: Partial<CashSession>): Promise<CashSession | null> {
  verifyServiceRoleRequirement("cash_sessions");
  let row = mapToRow("cashSessions", updates);
  // Ensure we don't try to sync id as update payload
  delete row.id;

  let attempts = 0;
  const maxAttempts = 15;
  let lastError: any = null;
  while (attempts < maxAttempts) {
    attempts++;
    try {
      const { data, error } = await supabase
        .from("cash_sessions")
        .update(row)
        .eq("id", sessionId)
        .select()
        .single();

      if (!error) {
        if (!data) return null;
        const result = mapFromRow("cashSessions", data);
        
        // Update local cache
        const idx = globalStateCache.cashSessions.findIndex(s => s.id === sessionId);
        if (idx !== -1) {
          globalStateCache.cashSessions[idx] = result;
        }
        writeDBToFileSystem(globalStateCache);
        
        return result;
      }

      const errMsg = error.message || "";
      const errCode = error.code || "";
      console.warn(`[Self-Healing Cash Session Update] Attempt ${attempts} failed: Code ${errCode}, Msg: ${errMsg}`);
      lastError = error;

      const cacheMatch = errMsg.match(/Could not find the '([^']+)' column/i) ||
                          errMsg.match(/column "([^"]+)" of relation/i) ||
                          errMsg.match(/column "([^"]+)" does not exist/i);
      
      if (cacheMatch || errCode === "42703") {
        let badColumn = cacheMatch ? cacheMatch[1] : null;
        if (!badColumn) {
          const colMatch = errMsg.match(/column "([^"]+)"/i) || errMsg.match(/column '([^']+)'/i);
          if (colMatch) badColumn = colMatch[1];
        }
        if (badColumn) {
          console.warn(`[Self-Healing Cash Session Update] Column [${badColumn}] not found. Auto-pruning and retrying...`);
          const { [badColumn]: _, ...rest } = row;
          row = rest;
          continue;
        }
      }

      console.error("[Supabase Update Error] Failed to update cash session:", error.message);
      break;
    } catch (err: any) {
      console.error("[Supabase Exception] updateCashSessionInSupabase exception:", err);
      lastError = err;
      break;
    }
  }

  throw new Error(`Failed to update cash session in cloud database: ${lastError?.message || lastError || "Unknown error"}`);
}

// --- Direct Supabase CRUD helpers for Categories ---
export async function getCategoriesFromSupabase(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    if (!data) return [];
    return data.map(row => mapFromRow("categories", row));
  } catch (err: any) {
    console.warn("[Supabase GET Categories Exception] Fallback to local memory cache:", err.message || err);
    return globalStateCache.categories || [];
  }
}

export async function insertCategoryToSupabase(category: Category): Promise<Category | null> {
  let row = mapToRow("categories", category);
  let attempts = 0;
  const maxAttempts = 15;
  let lastError: any = null;
  while (attempts < maxAttempts) {
    attempts++;
    try {
      const { data, error } = await supabase
        .from("categories")
        .insert([row])
        .select()
        .single();

      if (!error) {
        if (!data) return null;
        const result = mapFromRow("categories", data);
        
        // Keep in memory cache synchronized
        if (!globalStateCache.categories) globalStateCache.categories = [];
        const idx = globalStateCache.categories.findIndex(c => c.id === result.id);
        if (idx === -1) {
          globalStateCache.categories.push(result);
        } else {
          globalStateCache.categories[idx] = result;
        }
        writeDBToFileSystem(globalStateCache);
        return result;
      }

      const errMsg = error.message || "";
      const errCode = error.code || "";
      console.warn(`[Self-Healing Category Insert] Attempt ${attempts}: Code ${errCode}, Msg: ${errMsg}`);
      lastError = error;

      const cacheMatch = errMsg.match(/Could not find the '([^']+)' column/i) ||
                          errMsg.match(/column "([^"]+)" of relation/i) ||
                          errMsg.match(/column "([^"]+)" does not exist/i);
      if (cacheMatch || errCode === "42703") {
        let badColumn = cacheMatch ? cacheMatch[1] : null;
        if (!badColumn) {
          const colMatch = errMsg.match(/column "([^"]+)"/i) || errMsg.match(/column '([^']+)'/i);
          if (colMatch) badColumn = colMatch[1];
        }
        if (badColumn) {
          console.warn(`[Self-Healing Category Insert] Auto-pruning missing column [${badColumn}]...`);
          const { [badColumn]: _, ...rest } = row;
          row = rest;
          continue;
        }
      }
      console.error("[Supabase Insert Category Error]", errMsg);
      break;
    } catch (err) {
      console.error("[Supabase Insert Category Exception]", err);
      lastError = err;
      break;
    }
  }

  throw new Error(`Failed to insert category into cloud database: ${lastError?.message || lastError || "Unknown error"}`);
}

// --- Direct Supabase CRUD helpers for Suppliers ---
export async function getSuppliersFromSupabase(): Promise<Supplier[]> {
  try {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    if (!data) return [];
    return deduplicateById(data.map(row => mapFromRow("suppliers", row)));
  } catch (err: any) {
    console.warn("[Supabase GET Suppliers Exception] Fallback to local memory cache:", err.message || err);
    return globalStateCache.suppliers || [];
  }
}

export async function resolveOrCreateSupplier(supplierInput: any): Promise<string | null> {
  if (!supplierInput) return null;
  const inputStr = String(supplierInput).trim();
  if (
    !inputStr ||
    inputStr.toLowerCase() === "null" ||
    inputStr.toLowerCase() === "undefined" ||
    inputStr.toLowerCase() === "none" ||
    inputStr === ""
  ) {
    return null;
  }

  if (isSupabaseDisabled) {
    // Local fallback: search globalStateCache.suppliers
    const match = (globalStateCache.suppliers || []).find(
      s => s.id === inputStr || s.name.toLowerCase() === inputStr.toLowerCase() || (s.companyName && s.companyName.toLowerCase() === inputStr.toLowerCase())
    );
    if (match) return match.id;
    
    // Create new locally if name-like
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(inputStr) || (inputStr.startsWith("sup-") && uuidRegex.test(toUUIDIfNeeded(inputStr)));
    if (isUuid) {
      throw new Error(`Validation Failed: Selected supplier with ID '${inputStr}' does not exist.`);
    }

    const newId = `sup-${Date.now()}`;
    const newSup = {
      id: newId,
      name: inputStr,
      companyName: inputStr,
      email: "",
      phone: "",
      address: ""
    };
    if (!globalStateCache.suppliers) globalStateCache.suppliers = [];
    globalStateCache.suppliers.push(newSup);
    writeDBToFileSystem(globalStateCache);
    return newId;
  }

  // 1. Try to find by UUID directly
  const targetUuid = toUUIDIfNeeded(inputStr);
  const { data: matchingById, error: idErr } = await supabase
    .from("suppliers")
    .select("id")
    .eq("id", targetUuid)
    .limit(1);

  if (matchingById && matchingById.length > 0) {
    return matchingById[0].id;
  }

  // 2. Try to find by exact name
  const { data: matchingByName, error: nameErr } = await supabase
    .from("suppliers")
    .select("id")
    .eq("name", inputStr)
    .limit(1);

  if (matchingByName && matchingByName.length > 0) {
    return matchingByName[0].id;
  }

  // 3. Try to find by case-insensitive name
  const { data: matchingByNameIlike, error: nameIlikeErr } = await supabase
    .from("suppliers")
    .select("id")
    .ilike("name", inputStr)
    .limit(1);

  if (matchingByNameIlike && matchingByNameIlike.length > 0) {
    return matchingByNameIlike[0].id;
  }

  // 4. Try to find by company_name case-insensitive
  const { data: matchingByCompany, error: companyErr } = await supabase
    .from("suppliers")
    .select("id")
    .ilike("company_name", inputStr)
    .limit(1);

  if (matchingByCompany && matchingByCompany.length > 0) {
    return matchingByCompany[0].id;
  }

  // If we reach here, no existing supplier was found.
  // Is it a candidate for auto-creation? (We check if it's not a raw UUID or a potential UUID of a non-existing record)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUuid = uuidRegex.test(inputStr) || (inputStr.startsWith("sup-") && uuidRegex.test(targetUuid));

  if (isUuid) {
    throw new Error(`Validation Failed: Selected supplier with ID '${inputStr}' does not exist.`);
  }

  // Otherwise, it represents a Supplier Name we can auto-create.
  console.log(`[Supplier Auto-Creation] Creating new supplier named "${inputStr}"...`);
  const newSupId = toUUIDIfNeeded(`sup-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
  const newSup = {
    id: newSupId,
    name: inputStr,
    company_name: inputStr,
    email: "",
    phone: "",
    address: ""
  };

  const { data: createdSup, error: createError } = await supabase
    .from("suppliers")
    .insert([newSup])
    .select()
    .single();

  if (createError) {
    console.error("[Supplier Auto-Creation Failed]", createError.message);
    throw new Error(`Validation Failed: Failed to create/resolve supplier '${inputStr}': ${createError.message}`);
  }

  // Update globalStateCache supplier lists to keep local cache in sync immediately:
  if (createdSup) {
    const mapped = mapFromRow("suppliers", createdSup);
    if (!globalStateCache.suppliers) globalStateCache.suppliers = [];
    globalStateCache.suppliers.push(mapped);
    writeDBToFileSystem(globalStateCache);
  }

  return newSupId;
}

// --- Direct Supabase CRUD helpers for Medicines / Products ---
export async function getMedicinesFromSupabase(): Promise<Medicine[]> {
  try {
    const { data, error } = await supabase
      .from("medicines")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    if (!data) return [];
    return deduplicateById(data.map(row => mapFromRow("medicines", row)));
  } catch (err: any) {
    console.warn("[Supabase GET Medicines Exception] Fallback to local memory cache:", err.message || err);
    return globalStateCache.medicines || [];
  }
}

export async function insertMedicineToSupabase(medicine: Medicine): Promise<Medicine | null> {
  // Resolve or create supplier first!
  const resolvedSupplierId = await resolveOrCreateSupplier(medicine.supplierId);
  medicine.supplierId = resolvedSupplierId || ""; // Sync input object

  let row = mapToRow("medicines", medicine);
  row.supplier_id = resolvedSupplierId; // Use resolved supplier ID or null

  let attempts = 0;
  const maxAttempts = 15;
  let lastError: any = null;
  while (attempts < maxAttempts) {
    attempts++;
    try {
      const { data, error } = await supabase
        .from("medicines")
        .insert([row])
        .select()
        .single();

      if (!error) {
        if (!data) return null;
        const result = mapFromRow("medicines", data);
        
        // Keep in memory cache synchronized
        if (!globalStateCache.medicines) globalStateCache.medicines = [];
        const idx = globalStateCache.medicines.findIndex(m => m.id === result.id);
        if (idx === -1) {
          globalStateCache.medicines.push(result);
        } else {
          globalStateCache.medicines[idx] = result;
        }
        writeDBToFileSystem(globalStateCache);
        return result;
      }

      const errMsg = error.message || "";
      const errCode = error.code || "";
      console.warn(`[Self-Healing Medicine Insert] Attempt ${attempts}: Code ${errCode}, Msg: ${errMsg}`);
      lastError = error;

      const cacheMatch = errMsg.match(/Could not find the '([^']+)' column/i) ||
                          errMsg.match(/column "([^"]+)" of relation/i) ||
                          errMsg.match(/column "([^"]+)" does not exist/i);
      if (cacheMatch || errCode === "42703") {
        let badColumn = cacheMatch ? cacheMatch[1] : null;
        if (!badColumn) {
          const colMatch = errMsg.match(/column "([^"]+)"/i) || errMsg.match(/column '([^']+)'/i);
          if (colMatch) badColumn = colMatch[1];
        }
        if (badColumn) {
          console.warn(`[Self-Healing Medicine Insert] Auto-pruning missing column [${badColumn}]...`);
          const { [badColumn]: _, ...rest } = row;
          row = rest;
          continue;
        }
      }
      
      // Foreign key fallback self-healing
      if (errCode === "23503" || errMsg.includes("violates foreign key constraint")) {
        if (errMsg.includes("category_id")) {
          console.warn("[Self-Healing Medicine Insert] Category ID foreign key constraint failure. Retrying with NULL category_id...");
          row.category_id = null;
          continue;
        }
        if (errMsg.includes("supplier_id")) {
          // Task 5: Do not rely on self-healing retries to remove invalid supplier_id. Fail fast!
          throw new Error(`Validation Failed: Selected supplier ID '${row.supplier_id}' violates foreign key constraint medicines_supplier_id_fkey.`);
        }
      }
      
      console.error("[Supabase Insert Medicine Error]", errMsg);
      break;
    } catch (err) {
      console.error("[Supabase Insert Medicine Exception]", err);
      lastError = err;
      break;
    }
  }

  throw new Error(`Failed to insert medicine into cloud database: ${lastError?.message || lastError || "Unknown error"}`);
}

export async function updateMedicineInSupabase(id: string, updates: Partial<Medicine>): Promise<Medicine | null> {
  const targetId = toUUIDIfNeeded(id);

  // Resolve or create supplier first if supplierId is provided in updates!
  if (updates.supplierId !== undefined) {
    const resolvedSupplierId = await resolveOrCreateSupplier(updates.supplierId);
    updates.supplierId = resolvedSupplierId || "";
  }

  let row = mapToRow("medicines", updates);
  delete row.id; // protect id

  if (updates.supplierId !== undefined) {
    row.supplier_id = updates.supplierId || null;
  }

  let attempts = 0;
  const maxAttempts = 15;
  let lastError: any = null;
  while (attempts < maxAttempts) {
    attempts++;
    try {
      const { data, error } = await supabase
        .from("medicines")
        .update(row)
        .eq("id", targetId)
        .select()
        .single();

      if (!error) {
        if (!data) return null;
        const result = mapFromRow("medicines", data);
        
        // Sync local cache
        if (!globalStateCache.medicines) globalStateCache.medicines = [];
        const idx = globalStateCache.medicines.findIndex(m => m.id === result.id);
        if (idx !== -1) {
          globalStateCache.medicines[idx] = result;
        }
        writeDBToFileSystem(globalStateCache);
        return result;
      }

      const errMsg = error.message || "";
      const errCode = error.code || "";
      console.warn(`[Self-Healing Medicine Update] Attempt ${attempts}: Code ${errCode}, Msg: ${errMsg}`);
      lastError = error;

      const cacheMatch = errMsg.match(/Could not find the '([^']+)' column/i) ||
                          errMsg.match(/column "([^"]+)" of relation/i) ||
                          errMsg.match(/column "([^"]+)" does not exist/i);
      if (cacheMatch || errCode === "42703") {
        let badColumn = cacheMatch ? cacheMatch[1] : null;
        if (!badColumn) {
          const colMatch = errMsg.match(/column "([^"]+)"/i) || errMsg.match(/column '([^']+)'/i);
          if (colMatch) badColumn = colMatch[1];
        }
        if (badColumn) {
          console.warn(`[Self-Healing Medicine Update] Auto-pruning missing column [${badColumn}]...`);
          const { [badColumn]: _, ...rest } = row;
          row = rest;
          continue;
        }
      }

      // Foreign key fallback self-healing
      if (errCode === "23503" || errMsg.includes("violates foreign key constraint")) {
        if (errMsg.includes("category_id")) {
          console.warn("[Self-Healing Medicine Update] Category ID foreign key constraint failure. Retrying with NULL category_id...");
          row.category_id = null;
          continue;
        }
        if (errMsg.includes("supplier_id")) {
          // Task 5: Do not rely on self-healing retries to remove invalid supplier_id. Fail fast!
          throw new Error(`Validation Failed: Selected supplier ID '${row.supplier_id}' violates foreign key constraint medicines_supplier_id_fkey.`);
        }
      }

      console.error("[Supabase Update Medicine Error]", errMsg);
      break;
    } catch (err) {
      console.error("[Supabase Update Medicine Exception]", err);
      lastError = err;
      break;
    }
  }

  throw new Error(`Failed to update medicine in cloud database: ${lastError?.message || lastError || "Unknown error"}`);
}

export async function deleteMedicineFromSupabase(id: string): Promise<boolean> {
  const targetId = toUUIDIfNeeded(id);
  try {
    const { error } = await supabase
      .from("medicines")
      .delete()
      .eq("id", targetId);

    if (error) {
      console.error("[Supabase Delete Medicine Error]", error.message);
      throw error;
    }

    // Direct local cache evict
    if (!globalStateCache.medicines) globalStateCache.medicines = [];
    globalStateCache.medicines = globalStateCache.medicines.filter(m => m.id !== id);
    writeDBToFileSystem(globalStateCache);
    return true;
  } catch (err: any) {
    console.error("[Supabase Delete Medicine Exception]", err.message || err);
    throw new Error(`Failed to delete medicine from cloud database: ${err.message || err}`);
  }
}

