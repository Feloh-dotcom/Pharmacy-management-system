/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://ofwkndpzjlkumowdeaol.supabase.co";
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim() || "placeholder_not_configured";

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log("ℹ️ Info: SUPABASE_SERVICE_ROLE_KEY is unconfigured in development. Using local backing store with active Supabase client.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

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

export let isSupabaseDisabled = false;

export function isSupabaseActive(): boolean {
  return !isSupabaseDisabled;
}

// Automatically detect missing or invalid key during module initialization
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!rawKey || rawKey === "placeholder_not_configured" || rawKey.trim() === "") {
  isSupabaseDisabled = false; // Always keep active as source of truth
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

// --- Mappings Configurations ---
export const tableMappings: Record<string, { table: string; keyMap: Record<string, string> }> = {
  users: {
    table: "profiles",
    keyMap: {
      id: "id",
      name: "full_name",
      fullName: "full_name",
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
      imageUrl: "image_url",
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
      userEmail: "user_email"
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
      startDate: "start_date",
      endDate: "end_date",
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
      if (configName === "users" && snakeKey === "role" && typeof val === "string") {
        const normalized = val.trim().toLowerCase();
        if (normalized === "super admin") {
          val = "admin";
        } else if (normalized === "inventory manager") {
          val = "inventory_manager";
        } else {
          val = normalized;
        }
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
      row[snakeKey] = val;
    }
  }

  // 1. Extra logic for Users/Profiles table
  if (configName === "users") {
    row.name = item.name || item.fullName || "System User";
    row.full_name = item.name || item.fullName || "System User";
    if (!row.role) {
      row.role = "pharmacist";
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
  }

  // 3. Extra logic for cashSessions
  if (configName === "cashSessions") {
    const statusVal = String(item.status || "open").toLowerCase();
    row.status = statusVal;
    
    const openingVal = Number(item.openingBalance || item.opening_cash || item.opening_balance || 0);
    row.opening_cash = openingVal;
    row.opening_balance = openingVal;
    
    const expectedVal = Number(item.expectedClosingBalance || item.expected_cash || item.expected_closing_balance || 0);
    row.expected_cash = expectedVal;
    row.expected_closing_balance = expectedVal;
    
    const actualVal = (item.actualClosingBalance !== undefined && item.actualClosingBalance !== null) 
      ? Number(item.actualClosingBalance) 
      : ((item.actual_cash !== undefined && item.actual_cash !== null) ? Number(item.actual_cash) : ((item.actual_closing_balance !== undefined && item.actual_closing_balance !== null) ? Number(item.actual_closing_balance) : null));
    row.actual_cash = actualVal;
    row.actual_closing_balance = actualVal;
    
    const discrepancyVal = (item.variance !== undefined && item.variance !== null) 
      ? Number(item.variance) 
      : ((item.discrepancy !== undefined && item.discrepancy !== null) ? Number(item.discrepancy) : null);
    row.discrepancy = discrepancyVal;
    row.variance = discrepancyVal;

    const users = (globalStateCache && globalStateCache.users) || [];
    let openedById = row.opened_by || (item.openedBy ? (typeof item.openedBy === "object" ? toUUIDIfNeeded(item.openedBy.id) : toUUIDIfNeeded(item.openedBy)) : undefined);
    
    if (!openedById) {
      openedById = toUUIDIfNeeded("system@halomedical.com");
    }
    
    const openerExists = users.some(u => u.id === openedById || toUUIDIfNeeded(u.id) === openedById);
    if (!openerExists && users.length > 0) {
      openedById = toUUIDIfNeeded(users[0].id);
    }
    row.opened_by = openedById;
    row.openedBy = openedById;

    if (row.closed_by) {
      const closerExists = users.some(u => u.id === row.closed_by || toUUIDIfNeeded(u.id) === row.closed_by);
      if (!closerExists) {
        row.closed_by = null;
      }
    }
    row.notes = item.notes || item.note || "";
  }

  if (configName === "customers") {
    row.notes = JSON.stringify(item.prescriptionHistory || []);
  }

  if (configName === "sales") {
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
      if (configName === "users" && snakeKey === "role" && typeof val === "string") {
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
    item.salesInvoices = [];
    item.mpesaTransactionsAndAmounts = [];
    item.cashTransactions = [];
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
    item.items = [];
    if (row.notes) {
      try {
        const meta = JSON.parse(row.notes);
        if (meta && typeof meta === "object") {
          if (meta.cashPaid !== undefined) item.cashPaid = meta.cashPaid;
          if (meta.mpesaPaid !== undefined) item.mpesaPaid = meta.mpesaPaid;
          if (meta.mpesaTransactionCode !== undefined) item.mpesaTransactionCode = meta.mpesaTransactionCode;
          if (meta.mpesaPhoneNumber !== undefined) item.mpesaPhoneNumber = meta.mpesaPhoneNumber;
          if (meta.items !== undefined) item.items = meta.items;
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
    id: 1,
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
  return {
    general: row.general,
    security: row.security,
    financial: row.financial,
    inventory: row.inventory,
    notifications: row.notifications,
    integrations: row.integrations,
    aiAutomation: row.ai_automation,
    appearance: row.appearance,
    receipts: row.receipts,
    maintenance: row.maintenance
  };
}

// Global cached state synced with database in real-time
let globalStateCache: DBState = initialData;
let isInitialSyncDone = false;
let lastPullTimestamp = 0;
let isPullingInProgress = false;

export async function pullChangesFromSupabase(force = false): Promise<void> {
  if (isSupabaseDisabled) return;
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

    for (const key of tableKeys) {
      if (isSupabaseDisabled || disabledTables.has(key)) continue;

      const mapping = tableMappings[key];
      if (!mapping) continue;

      const { data, error } = await supabase
        .from(mapping.table)
        .select("*");
        
      if (error) {
        if (error.message?.includes("API key") || error.message?.includes("invalid_api_key") || error.code === "PGRST301" || (error as any).status === 401) {
          console.log(`[Supabase Pull Info] Standby mode for ${mapping.table} during pull: ${error.message}`);
          continue;
        }
      }

      if (!error && data) {
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
          
          const cloudEmails = new Set(mappedData.map(u => u.email.toLowerCase()));
          for (const localUser of localUsers) {
            if (localUser && localUser.email && !cloudEmails.has(localUser.email.toLowerCase())) {
              mergedUsers.push(localUser);
            }
          }
          (globalStateCache as any)[key] = mergedUsers;
        } else {
          (globalStateCache as any)[key] = mappedData;
        }
      }
    }

    if (!disabledTables.has("system_settings")) {
      const { data: allSettings, error: settingsError } = await supabase
        .from("system_settings")
        .select("*")
        .limit(1);
      if (!settingsError && allSettings && allSettings.length > 0) {
        globalStateCache.settings = mapSettingsFromRow(allSettings[0]);
      }
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

// --- Supabase Cloud database pulling, mapping and auto-seeding logic ---
export async function initSupabaseSync(): Promise<void> {
  console.log("[Supabase Sync] Pulling clinical data from Supabase...");
  
  // Seed memory cache initially from disk so we have a fully operational local baseline
  const localData = readDBFromFileSystem();
  globalStateCache = localData;

  if (isSupabaseDisabled) {
    console.log("[Supabase Sync Standby] Service Role Key is not configured or is placeholder. Utilizing high-availability local store cache.");
    const tableKeys = [
      "rolePermissions", "users", "categories", "suppliers", "medicines", "customers", 
      "sales", "inventoryLogs", "purchaseOrders", "financeRecords", "auditLogs", "branches", 
      "apiKeys", "backups", "cashSessions", "weeklyCycles", "mpesaTransactions", "system_settings"
    ];
    tableKeys.forEach(t => disabledTables.add(t));
    disabledTables.add("system_settings");
    isInitialSyncDone = true;
    return;
  }

  try {
    // 1. Fetch tables from Supabase in sequence to resolve foreign dependencies correctly
    const tableKeys = [
      "rolePermissions", "users", "categories", "suppliers", "medicines", "customers", 
      "sales", "inventoryLogs", "purchaseOrders", "financeRecords", "auditLogs", "branches", 
      "apiKeys", "backups", "cashSessions", "weeklyCycles", "mpesaTransactions"
    ];

    for (const key of tableKeys) {
      if (isSupabaseDisabled || disabledTables.has(key)) continue;

      const mapping = tableMappings[key];
      if (!mapping) continue;

      const primaryKeyName = key === "rolePermissions" ? "role" : "id";
      
      const { data, error } = await supabase
        .from(mapping.table)
        .select("*");
        
      if (error) {
        if (error.message?.includes("API key") || error.message?.includes("invalid_api_key") || error.code === "PGRST301" || (error as any).status === 401) {
          console.log(`[Supabase Sync Standby] Standby mode activated for table ${mapping.table} (Supabase API key unconfigured or invalid).`);
          continue;
        }
        if (error.message?.includes("Could not find the table") || error.message?.includes("relation") || error.message?.includes("does not exist")) {
          console.log(`[Supabase Sync Standby] Table ${mapping.table} does not exist in the active schema cache. Local storage backup will be active.`);
          disabledTables.add(key);
          continue;
        }
        console.log(`[Supabase Sync Standby] Query on ${mapping.table} failed. Seeder will auto-create: ${error.message}`);
        await seedTableToSupabase(key, (localData as any)[key] || []);
      } else if (!data || data.length === 0) {
        console.log(`[Supabase Sync] Table ${mapping.table} is empty. Auto-seeding metadata...`);
        await seedTableToSupabase(key, (localData as any)[key] || []);
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
          
          const cloudEmails = new Set(mappedData.map(u => u.email.toLowerCase()));
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
    if (!disabledTables.has("system_settings")) {
      const { data: allSettings, error: settingsError } = await supabase
        .from("system_settings")
        .select("*")
        .limit(1);
        
      if (settingsError || !allSettings || allSettings.length === 0) {
        if (settingsError && (settingsError.message?.includes("API key") || settingsError.message?.includes("invalid_api_key") || settingsError.code === "PGRST301" || (settingsError as any).status === 401)) {
          console.log("[Supabase Settings] Standby mode: Supabase is unconfigured or key is invalid.");
        } else if (settingsError && (settingsError.message?.includes("Could not find the table") || settingsError.message?.includes("relation") || settingsError.message?.includes("does not exist"))) {
          console.log("[Supabase Settings] system_settings table does not exist in schema cache. Local settings fallback active.");
          disabledTables.add("system_settings");
        } else {
          console.log("[Supabase Settings] Record empty. Seeding system_settings to database...");
          let settingsRow: any = mapSettingsToRow(localData.settings);
          let { error: seedErr } = await supabase
            .from("system_settings")
            .upsert(settingsRow);
            
          if (seedErr) {
            if (seedErr.message?.includes("API key") || seedErr.message?.includes("invalid_api_key") || seedErr.code === "PGRST301" || (seedErr as any).status === 401) {
              console.log("[Supabase Settings Seed Info] Key standby during system settings seed.");
            } else {
              console.log("[Supabase Settings Seed] Sync notes: ", seedErr.message);
            }
          } else {
            console.log("[Supabase Settings Seed] Successfully seeded system_settings!");
          }
        }
      } else {
        globalStateCache.settings = mapSettingsFromRow(allSettings[0]);
        console.log("[Supabase Settings] Loaded settings successfully.");
      }
    }

    isInitialSyncDone = true;
    console.log("[Supabase Sync] Supabase database synchronisation finished successfully!");
    
    // Save updated cloud-sourced state locally
    writeDBToFileSystem(globalStateCache);
  } catch (err) {
    console.error("[Supabase Init Sync Error] Fell back entirely to local file-system state:", err);
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

  let attempts = 0;
  const maxAttempts = 50;

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
    const { error } = await supabase
      .from(tableName)
      .upsert(attemptRows);

    if (!error) {
      return { error: null };
    }

    const errMsg = error.message;
    const errCode = error.code;
    console.log(`[Self-Healing Debug] tableName: ${tableName}, attempts: ${attempts}, errCode: ${errCode}, errMsg: ${errMsg}`);
    
    // Check if RLS error
    if (errMsg.includes("row-level security") || errCode === "42501") {
      return { error };
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
            const isRLS = error.message.includes("row-level security") || error.code === "42501";
            if (isRLS) {
              console.log(`[Supabase Sync] Note: ${mapping.table} sync updated locally, cloud sync bypassed due to RLS.`);
            } else {
              console.error(`[Supabase Sync Error] Upserting to ${mapping.table} failed:`, error.message);
            }
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
          console.error(`[Supabase Sync Error] Deleting from ${mapping.table} failed:`, error.message);
        }
      }
    }
    
    // 2. Sync system settings
    if (!disabledTables.has("system_settings") && JSON.stringify(oldState.settings) !== JSON.stringify(newState.settings)) {
      let settingsRow = mapSettingsToRow(newState.settings);
      let { error } = await supabase
        .from("system_settings")
        .upsert(settingsRow);
      if (error) {
        console.error("[Supabase Sync Error] Upserting system_settings failed:", error.message);
      }
    }
  } catch (err) {
    console.error("[Supabase Sync Delta] Execution exceptional error:", err);
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

export function writeDB(state: DBState): void {
  const oldState = { ...globalStateCache };
  globalStateCache = state;
  
  // Asynchronously write to both local system and Supabase cloud tables
  writeDBToFileSystem(state);
  syncChangesToSupabase(oldState, state).then(() => {
    // Force direct cloud fetch after writing changes to maintain absolute database integrity
    pullChangesFromSupabase(true).catch(e => console.error("[Sync Trigger Fail]", e));
  });
}

export function updateDB(updater: (state: DBState) => void): DBState {
  const oldState = { ...globalStateCache };
  
  const stateCopy = JSON.parse(JSON.stringify(globalStateCache));
  updater(stateCopy);
  globalStateCache = stateCopy;
  
  writeDBToFileSystem(stateCopy);
  syncChangesToSupabase(oldState, stateCopy).then(() => {
    // Force direct cloud fetch after writing changes to maintain absolute database integrity
    pullChangesFromSupabase(true).catch(e => console.error("[Sync Trigger Fail]", e));
  });
  return stateCopy;
}

// --- Direct Supabase queries for cash sessions (source of truth) ---
export async function getActiveCashSessionFromSupabase(): Promise<CashSession | null> {
  if (isSupabaseDisabled) {
    const session = (globalStateCache?.cashSessions || []).find(s => s.status === "Open");
    return session || null;
  }
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
        // No rows found
        return null;
      }
      console.error("[Supabase Query Error] Failed to get active cash session:", error.message);
      return null;
    }

    if (!data) return null;
    return mapFromRow("cashSessions", data);
  } catch (err) {
    console.error("[Supabase Exception] getActiveCashSessionFromSupabase:", err);
    return null;
  }
}

export async function getAllCashSessionsFromSupabase(): Promise<CashSession[]> {
  if (isSupabaseDisabled) {
    return globalStateCache?.cashSessions || [];
  }
  try {
    const { data, error } = await supabase
      .from("cash_sessions")
      .select("*")
      .order("opened_at", { ascending: false });

    if (error) {
      console.error("[Supabase Query Error] Failed to get cash sessions:", error.message);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];
    return data.map(row => mapFromRow("cashSessions", row));
  } catch (err) {
    console.error("[Supabase Exception] getAllCashSessionsFromSupabase:", err);
    return [];
  }
}

export async function insertCashSessionToSupabase(session: CashSession): Promise<CashSession | null> {
  if (isSupabaseDisabled) {
    if (!globalStateCache.cashSessions) globalStateCache.cashSessions = [];
    globalStateCache.cashSessions.unshift(session);
    writeDBToFileSystem(globalStateCache);
    return session;
  }
  try {
    const row = mapToRow("cashSessions", session);
    console.log("[Cash Session] Inserting session with data:", JSON.stringify(row, null, 2));
    
    const { data, error } = await supabase
      .from("cash_sessions")
      .insert([row])
      .select()
      .single();

    if (error) {
      console.error("[Supabase Insert Error] Failed to insert cash session:");
      console.error("  Message:", error.message);
      console.error("  Code:", error.code);
      console.error("  Details:", error.details);
      console.error("  Hint:", error.hint);
      console.error("  Row being inserted:", JSON.stringify(row, null, 2));
      return null;
    }

    if (!data) {
      console.error("[Supabase Insert Error] No data returned from insert");
      return null;
    }
    
    const result = mapFromRow("cashSessions", data);
    
    // Update local cache
    globalStateCache.cashSessions.unshift(result);
    writeDBToFileSystem(globalStateCache);
    
    console.log("[Cash Session] Successfully inserted session:", result.id);
    return result;
  } catch (err) {
    console.error("[Supabase Exception] insertCashSessionToSupabase:", err);
    return null;
  }
}

export async function updateCashSessionInSupabase(sessionId: string, updates: Partial<CashSession>): Promise<CashSession | null> {
  if (isSupabaseDisabled) {
    const idx = (globalStateCache?.cashSessions || []).findIndex(s => s.id === sessionId);
    if (idx !== -1) {
      const resultObj = { ...globalStateCache.cashSessions[idx], ...updates };
      globalStateCache.cashSessions[idx] = resultObj;
      writeDBToFileSystem(globalStateCache);
      return resultObj;
    }
    return null;
  }
  try {
    const row = mapToRow("cashSessions", updates);
    const { data, error } = await supabase
      .from("cash_sessions")
      .update(row)
      .eq("id", sessionId)
      .select()
      .single();

    if (error) {
      console.error("[Supabase Update Error] Failed to update cash session:", error.message);
      return null;
    }

    if (!data) return null;
    const result = mapFromRow("cashSessions", data);
    
    // Update local cache
    const idx = globalStateCache.cashSessions.findIndex(s => s.id === sessionId);
    if (idx !== -1) {
      globalStateCache.cashSessions[idx] = result;
    }
    writeDBToFileSystem(globalStateCache);
    
    return result;
  } catch (err) {
    console.error("[Supabase Exception] updateCashSessionInSupabase:", err);
    return null;
  }
}
