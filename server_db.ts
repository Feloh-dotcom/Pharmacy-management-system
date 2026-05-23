/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { 
  User, UserRole, Medicine, Category, Supplier, Customer, 
  Sale, InventoryLog, PurchaseOrder, FinanceRecord, AuditLog,
  SystemSettings, Branch, DeveloperApiKey, RolePermissions, BackupCheckpoint,
  CashSession, CashTransaction
} from "./src/types";

export function hashPassword(password: string, salt?: string) {
  const finalSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, finalSalt, 1000, 64, "sha512").toString("hex");
  return { salt: finalSalt, hash };
}

const DATA_FILE = path.join(process.cwd(), "data_store.json");

interface DBState {
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
}

const initialData: DBState = {
  users: [
    {
      id: "usr-1",
      name: "Budiono Siregar",
      email: "budionosiregar@gmail.com",
      role: UserRole.SUPER_ADMIN,
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
      isActive: true,
      createdAt: "2025-01-01T00:00:00Z"
    },
    {
      id: "usr-2",
      name: "Jane Smith",
      email: "janesmith@pharmacy.com",
      role: UserRole.PHARMACIST,
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
      isActive: true,
      createdAt: "2025-03-10T00:00:00Z"
    },
    {
      id: "usr-3",
      name: "John Doe",
      email: "johndoe@pharmacy.com",
      role: UserRole.CASHIER,
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      isActive: true,
      createdAt: "2025-04-12T00:00:00Z"
    }
  ],
  categories: [
    { id: "cat-1", name: "Antibiotics", description: "Bacterial infection fighters" },
    { id: "cat-2", name: "Analgesics", description: "Pain relievers and anti-inflammatory" },
    { id: "cat-3", name: "Antihistamines", description: "Allergy treatments" },
    { id: "cat-4", name: "Cardiovascular", description: "Blood pressure and heart medications" },
    { id: "cat-5", name: "Antidiabetic", description: "Blood glucose regulation medicines" }
  ],
  medicines: [
    {
      id: "med-1",
      name: "Medicine One",
      genericName: "Paracetamol",
      SKU: "MED-PR-001",
      batchNumber: "BCH-66291",
      expiryDate: "2027-08-15",
      buyingPrice: 180.00,
      sellingPrice: 270.00,
      quantity: 145,
      minStockLevel: 20,
      manufacturer: "GlaxoSmithKline",
      supplierId: "sup-1",
      categoryId: "cat-2",
      barcode: "8901234567890",
      taxVat: 16,
      prescriptionRequired: false,
      imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=120&h=120&fit=crop",
      createdAt: "2025-01-10T00:00:00Z"
    },
    {
      id: "med-2",
      name: "Medicine Two",
      genericName: "Amoxicillin",
      SKU: "MED-AMX-002",
      batchNumber: "BCH-38910",
      expiryDate: "2026-06-20",
      buyingPrice: 95.00,
      sellingPrice: 152.00,
      quantity: 8, // Low Stock for alerts!
      minStockLevel: 15,
      manufacturer: "Pfizer",
      supplierId: "sup-2",
      categoryId: "cat-1",
      barcode: "8902345678901",
      taxVat: 16,
      prescriptionRequired: true,
      imageUrl: "https://images.unsplash.com/photo-1550572017-edd951b55104?w=120&h=120&fit=crop",
      createdAt: "2025-01-12T00:00:00Z"
    },
    {
      id: "med-3",
      name: "Test Medicine",
      genericName: "Cetirizine",
      SKU: "MED-CTR-003",
      batchNumber: "BCH-55122",
      expiryDate: "2026-07-30",
      buyingPrice: 120.00,
      sellingPrice: 196.00,
      quantity: 210,
      minStockLevel: 30,
      manufacturer: "Bayer",
      supplierId: "sup-1",
      categoryId: "cat-3",
      barcode: "8903456789012",
      taxVat: 16,
      prescriptionRequired: false,
      imageUrl: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=120&h=120&fit=crop",
      createdAt: "2025-01-15T00:00:00Z"
    },
    {
      id: "med-4",
      name: "Lantus SoloStar",
      genericName: "Insulin Glargine",
      SKU: "MED-INS-004",
      batchNumber: "BCH-99102",
      expiryDate: "2026-05-30", // Near expiry date (prediction)!
      buyingPrice: 450.00,
      sellingPrice: 580.00,
      quantity: 22,
      minStockLevel: 10,
      manufacturer: "Sanofi",
      supplierId: "sup-3",
      categoryId: "cat-5",
      barcode: "8904567890123",
      taxVat: 0,
      prescriptionRequired: true,
      imageUrl: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=120&h=120&fit=crop",
      createdAt: "2025-02-01T00:00:00Z"
    },
    {
      id: "med-5",
      name: "Lipitor",
      genericName: "Atorvastatin",
      SKU: "MED-ATR-005",
      batchNumber: "BCH-10041",
      expiryDate: "2025-12-15", // Expired medicine!
      buyingPrice: 160.00,
      sellingPrice: 240.00,
      quantity: 12,
      minStockLevel: 15,
      manufacturer: "Pfizer",
      supplierId: "sup-2",
      categoryId: "cat-4",
      barcode: "8905678901234",
      taxVat: 16,
      prescriptionRequired: true,
      imageUrl: "https://images.unsplash.com/photo-1547853760-18471566e360?w=120&h=120&fit=crop",
      createdAt: "2025-02-10T00:00:00Z"
    }
  ],
  suppliers: [
    {
      id: "sup-1",
      name: "Astra Biotech Wholesalers",
      email: "orders@astrabiotech.com",
      phone: "+254 711 222333",
      companyName: "Astra Biotech Ltd",
      address: "Industrial Area, Sec 4, Nairobi, Kenya"
    },
    {
      id: "sup-2",
      name: "Global Pharma Distributors",
      email: "supply@globalpharma.net",
      phone: "+254 733 444555",
      companyName: "Global Pharma Kenya",
      address: "Mombasa Road, West Wing, Nairobi"
    },
    {
      id: "sup-3",
      name: "Sankara Medical Labs",
      email: "partners@sankaramed.org",
      phone: "+254 722 999888",
      companyName: "Sankara Medical Lab Solutions",
      address: "Karen Biotech Park, Nairobi"
    }
  ],
  customers: [
    {
      id: "cust-1",
      name: "Susan Williams",
      email: "gust@avohertiz.com", // matches mockup!
      phone: "+254 701 987654",
      loyaltyPoints: 340,
      insuranceProvider: "Jubilee Insurance",
      insurancePolicyNumber: "POL-JUB-88210",
      copayPercent: 10, // Copay is 10%, Insurance pays 90%
      prescriptionHistory: [
        { date: "2015-04-22T00:00:00.000Z", medicineName: "Medicine Two", quantity: 1 }
      ]
    },
    {
      id: "cust-2",
      name: "Bentley Howard",
      email: "gust@avohertiz.com", // matches mockup!
      phone: "+254 701 456123",
      loyaltyPoints: 420,
      insuranceProvider: "AAR Health",
      insurancePolicyNumber: "POL-AAR-45218",
      copayPercent: 20,
      prescriptionHistory: [
        { date: "2015-04-22T00:00:00.000Z", medicineName: "Test Medicine", quantity: 1 }
      ]
    },
    {
      id: "cust-3",
      name: "Evelyn Johnson",
      email: "gust@avohertiz.com", // matches mockup!
      phone: "+254 702 334455",
      loyaltyPoints: 850,
      insuranceProvider: "NHIF Cover",
      insurancePolicyNumber: "POL-NHIF-91180",
      copayPercent: 0, // NHIF pays 100% on authorized items
      prescriptionHistory: [
        { date: "2015-04-22T00:00:00.000Z", medicineName: "Medicine One", quantity: 1 }
      ]
    }
  ],
  sales: [
    {
      id: "sal-1",
      customerId: "cust-1",
      customerName: "Susan Williams",
      customerEmail: "gust@avohertiz.com",
      invoiceNumber: "INV-2015-001",
      items: [
        {
          medicineId: "med-2",
          medicineName: "Medicine Two",
          quantity: 1,
          price: 152.00,
          tax: 20.97 // 16% VAT implicit
        }
      ],
      totalPrice: 152.00,
      discount: 0,
      taxAmount: 20.97,
      paymentMethod: "Card",
      paymentStatus: "Paid",
      cashierEmail: "budionosiregar@gmail.com",
      date: "2015-04-22T00:00:00.000Z"
    },
    {
      id: "sal-2",
      customerId: "cust-2",
      customerName: "Bentley Howard",
      customerEmail: "gust@avohertiz.com",
      invoiceNumber: "INV-2015-002",
      items: [
        {
          medicineId: "med-3",
          medicineName: "Test Medicine",
          quantity: 1,
          price: 196.00,
          tax: 27.03
        }
      ],
      totalPrice: 196.00,
      discount: 0,
      taxAmount: 27.03,
      paymentMethod: "M-Pesa",
      paymentStatus: "Paid",
      cashierEmail: "budionosiregar@gmail.com",
      date: "2015-04-22T00:00:00.000Z"
    },
    {
      id: "sal-3",
      customerId: "cust-3",
      customerName: "Evelyn Johnson",
      customerEmail: "gust@avohertiz.com",
      invoiceNumber: "INV-2015-003",
      items: [
        {
          medicineId: "med-1",
          medicineName: "Medicine One",
          quantity: 1,
          price: 270.00,
          tax: 37.24
        }
      ],
      totalPrice: 270.00,
      discount: 0,
      taxAmount: 37.24,
      paymentMethod: "Cash",
      paymentStatus: "Paid",
      cashierEmail: "budionosiregar@gmail.com",
      date: "2015-04-22T00:00:00.000Z"
    }
  ],
  inventoryLogs: [
    {
      id: "log-1",
      medicineId: "med-1",
      medicineName: "Medicine One",
      type: "restock",
      quantity: 100,
      date: "2025-05-10T11:00:00Z",
      reason: "Initial Batch Restock",
      userEmail: "budionosiregar@gmail.com"
    },
    {
      id: "log-2",
      medicineId: "med-2",
      medicineName: "Medicine Two",
      type: "sale",
      quantity: 1,
      date: "2015-04-22T00:00:00Z",
      reason: "Invoice POS Sale INV-2015-001",
      userEmail: "budionosiregar@gmail.com"
    }
  ],
  purchaseOrders: [
    {
      id: "po-1",
      supplierId: "sup-1",
      supplierName: "Astra Biotech Wholesalers",
      items: [
        { medicineName: "Amoxicillin 500mg Batch B", quantity: 200, buyingPrice: 90.00 },
        { medicineName: "Cetirizine Syrup 100ml", quantity: 150, buyingPrice: 110.00 }
      ],
      totalAmount: 34500.00,
      status: "Received",
      orderDate: "2025-05-01T10:00:00Z",
      receivedDate: "2025-05-08T15:00:00Z"
    },
    {
      id: "po-2",
      supplierId: "sup-2",
      supplierName: "Global Pharma Distributors",
      items: [
        { medicineName: "Lantus SoloStar Insulin", quantity: 50, buyingPrice: 420.00 }
      ],
      totalAmount: 21000.00,
      status: "Approved",
      orderDate: "2025-05-18T10:00:00Z"
    }
  ],
  financeRecords: [
    {
      id: "fin-1",
      type: "expense",
      category: "Procurement",
      amount: 34500.00,
      description: "Payment for PO-1 Received Stock",
      paymentMethod: "Bank Transfer",
      date: "2025-05-08T15:15:00Z"
    },
    {
      id: "fin-2",
      type: "income",
      category: "POS Prescription Sales",
      amount: 618.00, // Total of our mockup sales ($152 + $196 + $270)
      description: "Direct sales register daily batch",
      paymentMethod: "Multiple",
      date: "2015-04-22T23:59:00Z"
    }
  ],
  auditLogs: [
    {
      id: "aud-1",
      userEmail: "budionosiregar@gmail.com",
      action: "Database Initialized",
      module: "System Core",
      date: "2025-05-22T06:12:00Z",
      details: "Database hydrated with system mock configurations."
    }
  ],
  settings: {
    general: {
      pharmacyName: "Halomedical Pharmacy Central",
      email: "contact@halomedical.org",
      phone: "+254 700 000000",
      address: "Biomedical Tower, Suite 402, Nairobi, KE",
      country: "Kenya",
      timezone: "Africa/Nairobi",
      currency: "KES",
      dateFormat: "YYYY-MM-DD",
      language: "en",
      logoUrl: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=120&h=120&fit=crop",
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
      aiStockPredictionActive: true
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
  branches: [
    {
      id: "br-1",
      name: "Main HQ Branch",
      code: "HQ-01",
      address: "Biomedical Tower, Suite 402, Nairobi, KE",
      phone: "+254 700 011",
      isActive: true,
      inventorySynced: true
    },
    {
      id: "br-2",
      name: "Westlands Hub",
      code: "WEST-02",
      address: "Mall Square Ground Floor, Nairobi, KE",
      phone: "+254 700 022",
      isActive: true,
      inventorySynced: true
    },
    {
      id: "br-3",
      name: "Mombasa Coast Terminal",
      code: "COAST-03",
      address: "Oceanic Mall, Mombasa, KE",
      phone: "+254 700 033",
      isActive: false,
      inventorySynced: false
    }
  ],
  apiKeys: [
    {
      id: "key-1",
      name: "ERP Sync Integrator",
      apiKey: "hm_pk_8820199a0d8bb2ecf301",
      createdAt: "2025-05-10T12:00:00Z",
      expiresAt: "2027-05-10T12:00:00Z",
      status: "Active"
    },
    {
      id: "key-2",
      name: "Local POS Offliner",
      apiKey: "hm_pk_3345112fcbe8d91028ab",
      createdAt: "2025-02-01T08:30:00Z",
      expiresAt: "2026-02-01T08:30:00Z",
      status: "Expired"
    }
  ],
  rolePermissions: [
    {
      role: "Super Admin",
      permissions: {
        manageMedicines: true,
        deleteSales: true,
        viewReports: true,
        approvePurchases: true,
        manageInventory: true,
        modifySettings: true
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
        modifySettings: false
      }
    },
    {
      role: "Cashier",
      permissions: {
        manageMedicines: false,
        deleteSales: false,
        viewReports: false,
        approvePurchases: false,
        manageInventory: false,
        modifySettings: false
      }
    }
  ],
  backups: [
    {
      id: "bk-1",
      filename: "halomed-db-backup-2026-05-20.enc",
      size: "2.4 MB",
      createdAt: "2026-05-20T23:00:01Z",
      storageProvider: "Local",
      status: "Success"
    },
    {
      id: "bk-2",
      filename: "halomed-db-backup-2026-05-15.enc",
      size: "2.3 MB",
      createdAt: "2026-05-15T23:00:00Z",
      storageProvider: "AWS S3",
      status: "Success"
    }
  ],
  cashSessions: []
};

export function readDB(): DBState {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), "utf-8");
      return initialData;
    }
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(raw);
    
    // Schema auto-migration layer: dynamically inject config arrays
    let changed = false;
    if (!data.settings) {
      data.settings = initialData.settings;
      changed = true;
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
    // Secure passwords migration layer
    if (data.users && Array.isArray(data.users)) {
      data.users.forEach((usr: any) => {
        if (!usr.passwordHash) {
          const { salt, hash } = hashPassword("password123");
          usr.passwordHash = hash;
          usr.salt = salt;
          usr.failedLoginAttempts = 0;
          changed = true;
        }
      });
    }
    if (changed) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
    }
    return data;
  } catch (err) {
    console.error("Failed to read database store:", err);
    return initialData;
  }
}

export function writeDB(state: DBState): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write database store:", err);
  }
}

export function updateDB(updater: (state: DBState) => void): DBState {
  const state = readDB();
  updater(state);
  writeDB(state);
  return state;
}
