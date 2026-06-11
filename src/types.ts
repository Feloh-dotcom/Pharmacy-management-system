/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = "Admin",
  PHARMACIST = "Pharmacist",
  CASHIER = "Cashier",
  INVENTORY_MANAGER = "Inventory Manager",
  SUPPLIER = "Supplier",
  CUSTOMER = "Customer",
  ACCOUNTANT = "Accountant",
  USER = "User",
}

export interface User {
  id: string;
  name: string;
  fullName?: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  passwordHash?: string;
  salt?: string;
  failedLoginAttempts?: number;
  lockedUntil?: string;
  phone?: string;
  bio?: string;
  nationalId?: string;
  address?: string;
  verificationStatus?: "Pending" | "Verified" | "Rejected" | "Under Review";
  verificationSubmittedAt?: string;
  verificationDetails?: {
    selfieUrl?: string;
    docType?: string;
    submittedDocumentUrl?: string;
    submittedAt?: string;
    reviewerComment?: string;
  };
  passwordSetupCompleted?: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  SKU: string;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  buyingPrice: number;
  sellingPrice: number;
  quantity: number;
  minStockLevel: number;
  manufacturer: string;
  supplierId?: string | null;
  categoryId: string;
  barcode: string;
  taxVat: number; // percentage (e.g. 16 for 16%)
  prescriptionRequired: boolean;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  address: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  loyaltyPoints: number;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  copayPercent?: number; // e.g. 20 for 20% user copay, 80% insurance
  prescriptionHistory: Array<{
    date: string;
    medicineName: string;
    quantity: number;
  }>;
}

export interface SaleItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  price: number;
  tax: number;
}

export interface Sale {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  invoiceNumber: string;
  items: SaleItem[];
  totalPrice: number;
  discount: number;
  taxAmount: number;
  paymentMethod: "Cash" | "M-Pesa" | "Card" | "Split";
  paymentStatus: "Paid" | "Refunded" | "Pending";
  cashierEmail: string;
  date: string; // ISO string
  cashPaid?: number;
  mpesaPaid?: number;
  mpesaTransactionCode?: string;
  mpesaPhoneNumber?: string;
}

export interface InventoryLog {
  id: string;
  medicineId: string;
  medicineName: string;
  type: "restock" | "sale" | "damaged" | "transfer";
  quantity: number;
  date: string;
  reason: string;
  userEmail: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  items: Array<{
    medicineName: string;
    quantity: number;
    buyingPrice: number;
  }>;
  totalAmount: number;
  status: "Pending" | "Approved" | "Received";
  orderDate: string;
  receivedDate?: string;
}

export interface FinanceRecord {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string;
  paymentMethod: string;
  date: string;
}

export interface AuditLog {
  id: string;
  userEmail: string;
  action: string;
  module: string;
  date: string;
  details: string;
}

export interface DashboardMetrics {
  todaysSales: {
    value: number;
    changePercent: number;
  };
  availableCategories: {
    value: number;
    changePercent: number;
  };
  expiredMedicines: {
    count: number;
    changePercent: number;
  };
  systemUsers: {
    count: number;
    changePercent: number;
  };
  graphReport: {
    purchases: number;
    suppliers: number;
    sales: number;
    noSales: number;
  };
  totalSalesOverview: Array<{
    day: string; // Mon, Tue, etc.
    value: number; // e.g., 298 for $298.00K or $298.00
    color: string;
  }>;
  weeklyCycles?: Array<{
    id: string;
    status: "Active" | "Archived";
    startDate: string;
    endDate: string;
  }>;
  selectedWeekId?: string | null;
  weeklyRevenue?: number;
}

export interface AISmartForecast {
  expiryPredictions: Array<{
    medicineId: string;
    medicineName: string;
    SKU: string;
    expiryDate: string;
    daysToExpiry: number;
    riskStatus: "Critical" | "Warning" | "Safe";
    actionRecommended: string;
  }>;
  stockReorderSuggestions: Array<{
    medicineId: string;
    medicineName: string;
    currentStock: number;
    minStock: number;
    reorderQuantity: number;
    supplierName: string;
    confidenceLevel: number; // percentage
    rationale: string;
  }>;
  salesPredictions: Array<{
    month: string;
    predictedRevenue: number;
    growthTrend: string;
  }>;
}

export interface SystemSettings {
  general: {
    pharmacyName: string;
    email: string;
    phone: string;
    address: string;
    country: string;
    timezone: string;
    currency: string;
    dateFormat: string;
    language: string;
    logoUrl: string;
    registrationNumber: string;
  };
  security: {
    passwordMinLength: number;
    requireSpecialChar: boolean;
    sessionTimeout: number;
    mfaEnabled: boolean;
    ipWhitelist: string;
    accountLockoutAttempts: number;
    failedLoginMonitoring: boolean;
  };
  financial: {
    vatPercentage: number;
    taxPercentage: number;
    currencyPrecision: number;
    invoiceNumberPrefix: string;
    financialYearStart: string;
    selectedPaymentMethods: string[];
  };
  inventory: {
    autoReorderThreshold: number;
    expiryWarningPeriodDays: number;
    batchTrackingEnabled: boolean;
    barcodeScanningEnabled: boolean;
    lowStockAlertActive: boolean;
    aiStockPredictionActive: boolean;
    expiryAlertSeverity?: "critical" | "high" | "medium";
    preventSaleOfExpiredGoods?: boolean;
    notifyOnExpiryNear?: boolean;
  };
  notifications: {
    emailAlerts: boolean;
    smsAlerts: boolean;
    pushAlerts: boolean;
    whatsappAlerts: boolean;
    smtpHost: string;
    smtpPort: number;
    smtpUsername: string;
    smtpPassword?: string;
  };
  integrations: {
    cloudinaryApiKey: string;
    stripeSecretKey: string;
    awsS3Bucket: string;
    twilioSid: string;
    googleAnalyticsId: string;
  };
  aiAutomation: {
    aiReorderSmartThreshold: number;
    aiPredictiveExpiryForecast: boolean;
    aiNaturalLanguageCopilot: boolean;
    geminiModelSelection: string;
  };
  appearance: {
    themeMode: "light" | "dark";
    sidebarStyle: string;
    themeColors: string;
    borderRadius: number;
    animationSpeed: string;
  };
  receipts: {
    receiptFooterText: string;
    invoicePrefix: string;
    showTaxBreakdown: boolean;
    paperSize: string;
  };
  maintenance: {
    maintenanceMode: boolean;
    cacheExpiryMinutes: number;
  };
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  isActive: boolean;
  inventorySynced: boolean;
}

export interface DeveloperApiKey {
  id: string;
  name: string;
  apiKey: string;
  createdAt: string;
  expiresAt: string;
  status: "Active" | "Revoked" | "Expired";
}

export interface RolePermissions {
  role: string;
  permissions: {
    manageMedicines: boolean;
    deleteSales: boolean;
    viewReports: boolean;
    approvePurchases: boolean;
    manageInventory: boolean;
    modifySettings: boolean;
    addProducts?: boolean;
    editProducts?: boolean;
    addCategories?: boolean;
    editCategories?: boolean;
    adjustStock?: boolean;
  };
}

export interface BackupCheckpoint {
  id: string;
  filename: string;
  size: string;
  createdAt: string;
  storageProvider: "Local" | "AWS S3" | "Cloudinary";
  status: "Success" | "Failed";
}

export interface CashTransaction {
  id: string;
  type: "Sale" | "Refund" | "Expense" | "Cash-In" | "Cash-Out";
  amount: number;
  paymentMethod?: string;
  referenceId?: string;
  description: string;
  timestamp: string;
  userEmail: string;
}

export interface CashSession {
  id: string;
  status: "Open" | "Closed";
  openedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  closedBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  expectedClosingBalance: number;
  actualClosingBalance?: number;
  variance?: number; // actualClosingBalance - expectedClosingBalance
  salesInvoices: string[];
  totalSalesAmount: number;
  totalInvoicesCount: number;
  cashPayments: number;
  mobileMoneyPayments: number;
  cardPayments: number;
  discounts: number;
  refunds: number;
  expenses: number;
  transactions: CashTransaction[];
  note?: string;
  notes?: string;
  totalMpesaAmount?: number;
  totalCashAmount?: number;
  totalDiscounts?: number;
  totalRefunds?: number;
  totalExpenses?: number;
}


