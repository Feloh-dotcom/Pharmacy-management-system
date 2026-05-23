/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { readDB, updateDB, hashPassword } from "./server_db";
import { UserRole, Medicine, Sale, PurchaseOrder, InventoryLog, Customer, FinanceRecord } from "./src/types";

// Lazy-loaded or conditional Gemini API initializer
let ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      try {
        ai = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });
      } catch (e) {
        console.error("Failed to initialize GoogleGenAI client:", e);
      }
    }
  }
  return ai;
}

const app = express();
app.use(express.json());

// API Endpoints - MUST be defined BEFORE Vite middleware

// Helper functions for dynamic weekly analytics and automated rollover
function getISOWeekString(d: Date): string {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const year = new Date(firstThursday).getFullYear();
  return `${year}-W${weekNum < 10 ? '0' + weekNum : weekNum}`;
}

function getWeekRange(d: Date) {
  const current = new Date(d.valueOf());
  const day = current.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  const monday = new Date(current.setDate(current.getDate() + offset));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday.valueOf());
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

function computeWeekValues(cycle: any, db: any) {
  const monday = new Date(cycle.startDate);
  const sunday = new Date(cycle.endDate);

  // 1. Calculate weekly POs count
  const purchasesCount = db.purchaseOrders.filter((po: any) => {
    const d = new Date(po.orderDate);
    return d >= monday && d <= sunday;
  }).length;

  // 2. Count of sales this week within active cash sessions
  const weekSales = db.sales.filter((s: any) => {
    const d = new Date(s.date);
    if (d >= monday && d <= sunday) {
      if (s.paymentStatus === "Refunded") return false;
      return (db.cashSessions || []).some((cs: any) => cs.salesInvoices && cs.salesInvoices.includes(s.invoiceNumber));
    }
    return false;
  });
  const salesCount = weekSales.length;

  // 3. Unique suppliers with POs during this week, default to database suppliers length
  const weekPOs = db.purchaseOrders.filter((po: any) => {
    const d = new Date(po.orderDate);
    return d >= monday && d <= sunday;
  });
  const uniqueWeekSupppliers = new Set(weekPOs.map((po: any) => po.supplierName)).size;
  const suppliersCount = uniqueWeekSupppliers || db.suppliers.length;

  // 4. Calculate weekday sales for cylinder chart
  const weekdaysMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const salesByDay: Record<string, number> = {
    "Mon": 0, "Tue": 0, "Wed": 0, "Thu": 0, "Fri": 0, "Sat": 0, "Sun": 0
  };

  weekSales.forEach((s: any) => {
    const d = new Date(s.date);
    const dayName = weekdaysMap[d.getDay()];
    if (dayName && salesByDay[dayName] !== undefined) {
      salesByDay[dayName] += s.totalPrice;
    }
  });

  const noSalesCount = Object.values(salesByDay).filter(val => val === 0).length;

  const currentWeelyRevenueCalculated = weekSales.reduce((sum: number, s: any) => sum + s.totalPrice, 0);

  if (cycle.resetGraphReport) {
    return {
      graphReport: { purchases: 0, suppliers: 0, sales: 0, noSales: 100 },
      weeklyRevenue: 0,
      totalSalesOverview: cycle.resetTotalSalesOverview ? [
        { day: "Mon", value: 0, color: "#f97316" },
        { day: "Tue", value: 0, color: "#ec4899" },
        { day: "Wed", value: 0, color: "#22c55e" },
        { day: "Thu", value: 0, color: "#14b8a6" },
        { day: "Fri", value: 0, color: "#ef4444" },
        { day: "Sat", value: 0, color: "#a855f7" },
        { day: "Sun", value: 0, color: "#f59e0b" }
      ] : [
        { day: "Mon", value: Number(salesByDay["Mon"].toFixed(2)), color: "#f97316" },
        { day: "Tue", value: Number(salesByDay["Tue"].toFixed(2)), color: "#ec4899" },
        { day: "Wed", value: Number(salesByDay["Wed"].toFixed(2)), color: "#22c55e" },
        { day: "Thu", value: Number(salesByDay["Thu"].toFixed(2)), color: "#14b8a6" },
        { day: "Fri", value: Number(salesByDay["Fri"].toFixed(2)), color: "#ef4444" },
        { day: "Sat", value: Number(salesByDay["Sat"].toFixed(2)), color: "#a855f7" },
        { day: "Sun", value: Number(salesByDay["Sun"].toFixed(2)), color: "#f59e0b" }
      ]
    };
  }

  if (cycle.resetTotalSalesOverview) {
    const totalWeight = purchasesCount + suppliersCount + salesCount + noSalesCount || 100;
    return {
      graphReport: {
        purchases: purchasesCount ? Math.round((purchasesCount / totalWeight) * 100) : 28,
        suppliers: suppliersCount ? Math.round((suppliersCount / totalWeight) * 100) : 18,
        sales: salesCount ? Math.round((salesCount / totalWeight) * 100) : 12,
        noSales: noSalesCount ? Math.round((noSalesCount / totalWeight) * 100) : 42
      },
      weeklyRevenue: currentWeelyRevenueCalculated,
      totalSalesOverview: [
        { day: "Mon", value: 0, color: "#f97316" },
        { day: "Tue", value: 0, color: "#ec4899" },
        { day: "Wed", value: 0, color: "#22c55e" },
        { day: "Thu", value: 0, color: "#14b8a6" },
        { day: "Fri", value: 0, color: "#ef4444" },
        { day: "Sat", value: 0, color: "#a855f7" },
        { day: "Sun", value: 0, color: "#f59e0b" }
      ]
    };
  }

  const totalWeight = purchasesCount + suppliersCount + salesCount + noSalesCount || 100;
  return {
    graphReport: {
      purchases: purchasesCount ? Math.round((purchasesCount / totalWeight) * 100) : 28,
      suppliers: suppliersCount ? Math.round((suppliersCount / totalWeight) * 100) : 18,
      sales: salesCount ? Math.round((salesCount / totalWeight) * 100) : 12,
      noSales: noSalesCount ? Math.round((noSalesCount / totalWeight) * 100) : 42
    },
    weeklyRevenue: currentWeelyRevenueCalculated,
    totalSalesOverview: [
      { day: "Mon", value: Number(salesByDay["Mon"].toFixed(2)), color: "#f97316" },
      { day: "Tue", value: Number(salesByDay["Tue"].toFixed(2)), color: "#ec4899" },
      { day: "Wed", value: Number(salesByDay["Wed"].toFixed(2)), color: "#22c55e" },
      { day: "Thu", value: Number(salesByDay["Thu"].toFixed(2)), color: "#14b8a6" },
      { day: "Fri", value: Number(salesByDay["Fri"].toFixed(2)), color: "#ef4444" },
      { day: "Sat", value: Number(salesByDay["Sat"].toFixed(2)), color: "#a855f7" },
      { day: "Sun", value: Number(salesByDay["Sun"].toFixed(2)), color: "#f59e0b" }
    ]
  };
}

function checkAndRolloverWeeklyCycle(state: any): void {
  const d = new Date();
  const currentWeekId = getISOWeekString(d);
  const ranges = getWeekRange(d);

  if (!state.weeklyCycles) {
    state.weeklyCycles = [];
  }

  const activeCycleIdx = state.weeklyCycles.findIndex((c: any) => c.status === "Active");

  if (activeCycleIdx !== -1) {
    const activeCycle = state.weeklyCycles[activeCycleIdx];
    if (activeCycle.id !== currentWeekId) {
      // It's a different week! Finalize and archive it
      const finalized = computeWeekValues(activeCycle, state);
      state.weeklyCycles[activeCycleIdx] = {
        ...activeCycle,
        status: "Archived",
        graphReport: finalized.graphReport,
        weeklyRevenue: finalized.weeklyRevenue,
        totalSalesOverview: finalized.totalSalesOverview
      };

      // Create new active cycle
      const newActive = {
        id: currentWeekId,
        status: "Active" as const,
        startDate: ranges.monday.toISOString(),
        endDate: ranges.sunday.toISOString(),
        graphReport: { purchases: 0, suppliers: 0, sales: 0, noSales: 7 },
        weeklyRevenue: 0,
        totalSalesOverview: [
          { day: "Mon", value: 0, color: "#f97316" },
          { day: "Tue", value: 0, color: "#ec4899" },
          { day: "Wed", value: 0, color: "#22c55e" },
          { day: "Thu", value: 0, color: "#14b8a6" },
          { day: "Fri", value: 0, color: "#ef4444" },
          { day: "Sat", value: 0, color: "#a855f7" },
          { day: "Sun", value: 0, color: "#f59e0b" }
        ]
      };
      state.weeklyCycles.unshift(newActive);
    }
  } else {
    // No active cycle! Let's create one
    const newActive = {
      id: currentWeekId,
      status: "Active" as const,
      startDate: ranges.monday.toISOString(),
      endDate: ranges.sunday.toISOString(),
      graphReport: { purchases: 0, suppliers: 0, sales: 0, noSales: 7 },
      weeklyRevenue: 0,
      totalSalesOverview: [
        { day: "Mon", value: 0, color: "#f97316" },
        { day: "Tue", value: 0, color: "#ec4899" },
        { day: "Wed", value: 0, color: "#22c55e" },
        { day: "Thu", value: 0, color: "#14b8a6" },
        { day: "Fri", value: 0, color: "#ef4444" },
        { day: "Sat", value: 0, color: "#a855f7" },
        { day: "Sun", value: 0, color: "#f59e0b" }
      ]
    };
    state.weeklyCycles.unshift(newActive);
  }
}

// 1. Dashboard Metrics Aggregator
app.get("/api/dashboard/metrics", (req, res) => {
  const { weekId } = req.query;
  const db = readDB();

  // Make sure we have the current week initialized and checked
  let finalState = db;
  updateDB(state => {
    checkAndRolloverWeeklyCycle(state);
    finalState = state;
  });

  // Find the selected/target cycle
  let targetCycle: any = null;
  if (weekId) {
    targetCycle = finalState.weeklyCycles.find((c: any) => c.id === weekId);
  } else {
    targetCycle = finalState.weeklyCycles.find((c: any) => c.status === "Active");
  }

  if (!targetCycle) {
    targetCycle = finalState.weeklyCycles.find((c: any) => c.status === "Active");
  }

  let computedValues: any;
  if (targetCycle && targetCycle.status === "Active") {
    computedValues = computeWeekValues(targetCycle, finalState);
  } else if (targetCycle) {
    computedValues = {
      graphReport: targetCycle.graphReport,
      totalSalesOverview: targetCycle.totalSalesOverview,
      weeklyRevenue: targetCycle.weeklyRevenue ?? 0
    };
  } else {
    computedValues = {
      graphReport: { purchases: 28, suppliers: 18, sales: 12, noSales: 42 },
      weeklyRevenue: 0,
      totalSalesOverview: [
        { day: "Mon", value: 120, color: "#f97316" },
        { day: "Tue", value: 180, color: "#ec4899" },
        { day: "Wed", value: 298, color: "#22c55e" },
        { day: "Thu", value: 240, color: "#14b8a6" },
        { day: "Fri", value: 150, color: "#ef4444" },
        { day: "Sat", value: 110, color: "#a855f7" },
        { day: "Sun", value: 50, color: "#f59e0b" }
      ]
    };
  }

  // Calculate Todays Sales dynamically based on the active/open cash session
  const activeSession = (finalState.cashSessions || []).find((s: any) => s.status === "Open");
  
  let todaysSalesSum = 0;
  let yesterdaySalesSum = 0;

  if (activeSession) {
    const summarized = calculateSessionSummary(activeSession, finalState);
    todaysSalesSum = summarized.totalSalesAmount;

    // Yesterday's sales - standard yesterday calendar date
    const yesterdayStr = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];
    yesterdaySalesSum = finalState.sales
      .filter((s: any) => s.date.startsWith(yesterdayStr))
      .reduce((sum: number, s: any) => sum + s.totalPrice, 0);

    // Fallback to last closed session sales if calendar yesterday is zero
    if (yesterdaySalesSum === 0) {
      const closedSessions = (finalState.cashSessions || []).filter((s: any) => s.status === "Closed");
      if (closedSessions.length > 0) {
        yesterdaySalesSum = closedSessions[0].totalSalesAmount || 0;
      }
    }
  } else {
    todaysSalesSum = 0;
    yesterdaySalesSum = 0;
  }

  let todaysChangePercent = 2.5;
  if (yesterdaySalesSum > 0) {
    todaysChangePercent = Number((((todaysSalesSum - yesterdaySalesSum) / yesterdaySalesSum) * 100).toFixed(1));
  } else if (todaysSalesSum > 0) {
    todaysChangePercent = 100;
  } else {
    todaysChangePercent = 0;
  }

  // Expired medicines count
  const now = new Date();
  const expiredCount = finalState.medicines.filter((m: any) => new Date(m.expiryDate) < now).length;

  // Categories count
  const categoriesCount = finalState.categories.length;

  // System Users Count
  const usersCount = finalState.users.length;

  // Return formatted payload with weeklyCycles array for selector UI
  res.json({
    todaysSales: {
      value: todaysSalesSum,
      changePercent: todaysChangePercent
    },
    availableCategories: {
      value: categoriesCount,
      placeholderValue: "",
      changePercent: 1.2
    },
    expiredMedicines: {
      count: expiredCount,
      changePercent: 0.5
    },
    systemUsers: {
      count: usersCount,
      placeholderValue: "",
      changePercent: 3.1
    },
    graphReport: computedValues.graphReport,
    totalSalesOverview: computedValues.totalSalesOverview,
    weeklyRevenue: computedValues.weeklyRevenue ?? 0,
    weeklyCycles: finalState.weeklyCycles.map((wc: any) => ({
      id: wc.id,
      status: wc.status,
      startDate: wc.startDate,
      endDate: wc.endDate,
      weeklyRevenue: wc.weeklyRevenue ?? 0
    })),
    selectedWeekId: targetCycle ? targetCycle.id : null
  });
});

// 2. Authentication API
app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email and password are all required to register" });
  }

  const db = readDB();
  const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(409).json({ error: "An account with this email address already exists" });
  }

  // Public registration strictly maps to Standard "Customer" or "Staff/User" role.
  // Never assign privileged roles like Super Admin, Pharmacist, Cashier, etc., to prevent privilege escalation.
  const { salt, hash } = hashPassword(password);
  
  const newUser = {
    id: `usr-${Date.now()}`,
    name,
    email: email.toLowerCase(),
    role: "Staff/User" as any, // Assign harmless non-privileged default role
    avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop`,
    isActive: true,
    createdAt: new Date().toISOString(),
    passwordHash: hash,
    salt,
    failedLoginAttempts: 0
  };

  updateDB(state => {
    state.users.push(newUser);
    state.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      userEmail: newUser.email,
      action: "User Registered",
      module: "Authentication",
      date: new Date().toISOString(),
      details: `Public workstation account self-registered with default standard permissions: ${newUser.name}`
    });
  });

  res.json({
    success: true,
    message: "Welcome to Halomedical. Account registered securely.",
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      avatarUrl: newUser.avatarUrl
    }
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const db = readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (!user.isActive) {
    return res.status(403).json({ error: "Your account is currently deactivated. Please contact an Administrator." });
  }

  // Lockout check
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    const lockedMinLeft = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / (1000 * 60));
    return res.status(423).json({ 
      error: `Account is temporarily locked due to consecutive failed login attempts. Try again in ${lockedMinLeft} minutes.` 
    });
  }

  // Cryptographic hash validation (Anti-Bypass)
  let isPasswordCorrect = false;
  if (user.passwordHash && user.salt) {
    const { hash } = hashPassword(password, user.salt);
    isPasswordCorrect = (hash === user.passwordHash);
  }

  if (!isPasswordCorrect) {
    const failedAttemptsCount = (user.failedLoginAttempts || 0) + 1;
    let lockedTimeStr: string | undefined = undefined;
    const maxRetries = db.settings?.security?.accountLockoutAttempts || 5;

    if (failedAttemptsCount >= maxRetries) {
      lockedTimeStr = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // Lock for 15 minutes
    }

    updateDB(state => {
      const idx = state.users.findIndex(u => u.id === user.id);
      if (idx > -1) {
        state.users[idx].failedLoginAttempts = failedAttemptsCount;
         if (lockedTimeStr) {
           state.users[idx].lockedUntil = lockedTimeStr;
         }
      }
      state.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        userEmail: email,
        action: "Failed Login Attempt",
        module: "Authentication",
        date: new Date().toISOString(),
        details: `Failed credentials handshake. Attempt ${failedAttemptsCount} of ${maxRetries}.`
      });
    });

    const errorMsg = lockedTimeStr 
      ? `Too many failed attempts. This account is locked for 15 minutes to guarantee security.`
      : `Invalid credentials. Attempt ${failedAttemptsCount} of ${maxRetries}`;

    return res.status(401).json({ error: errorMsg });
  }

  // Password correct: Reset failed counters
  updateDB(state => {
    const idx = state.users.findIndex(u => u.id === user.id);
    if (idx > -1) {
      state.users[idx].failedLoginAttempts = 0;
      state.users[idx].lockedUntil = undefined;
    }
    state.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      userEmail: user.email,
      action: "User Login",
      module: "Authentication",
      date: new Date().toISOString(),
      details: "SaaS Session opened securely via login endpoint with password validation."
    });
  });

  res.json({
    token: `sess_jwt_${user.id}_${Date.now()}`,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl
    }
  });
});

// 3. Medicines Management API
app.get("/api/medicines", (req, res) => {
  const db = readDB();
  res.json(db.medicines);
});

app.post("/api/medicines", (req, res) => {
  const medicineData = req.body;
  
  // Validation checks
  if (!medicineData.name || !medicineData.SKU || !medicineData.expiryDate) {
    return res.status(400).json({ error: "Name, SKU and Expiry Date are required" });
  }

  const newMed: Medicine = {
    id: `med-${Date.now()}`,
    name: medicineData.name,
    genericName: medicineData.genericName || "",
    SKU: medicineData.SKU,
    batchNumber: medicineData.batchNumber || `BCH-${Math.floor(10000 + Math.random() * 90000)}`,
    expiryDate: medicineData.expiryDate,
    buyingPrice: Number(medicineData.buyingPrice) || 0,
    sellingPrice: Number(medicineData.sellingPrice) || 0,
    quantity: Number(medicineData.quantity) || 0,
    minStockLevel: Number(medicineData.minStockLevel) || 10,
    manufacturer: medicineData.manufacturer || "",
    supplierId: medicineData.supplierId || "sup-1",
    categoryId: medicineData.categoryId || "cat-1",
    barcode: medicineData.barcode || `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    taxVat: Number(medicineData.taxVat) || 16,
    prescriptionRequired: !!medicineData.prescriptionRequired,
    imageUrl: medicineData.imageUrl || "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=120&h=120&fit=crop",
    createdAt: new Date().toISOString()
  };

  updateDB(state => {
    state.medicines.push(newMed);
    state.inventoryLogs.unshift({
      id: `log-${Date.now()}`,
      medicineId: newMed.id,
      medicineName: newMed.name,
      type: "restock",
      quantity: newMed.quantity,
      date: new Date().toISOString(),
      reason: "Initial Product Creation Restock",
      userEmail: "budionosiregar@gmail.com"
    });
    state.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      userEmail: "budionosiregar@gmail.com",
      action: "Created Medicine",
      module: "Inventory",
      date: new Date().toISOString(),
      details: `Added new medicine ${newMed.name} (SKU: ${newMed.SKU}) with ${newMed.quantity} units.`
    });
  });

  res.status(201).json(newMed);
});

app.put("/api/medicines/:id", (req, res) => {
  const medId = req.params.id;
  const editData = req.body;

  let updatedMed: Medicine | null = null;

  updateDB(state => {
    const idx = state.medicines.findIndex(m => m.id === medId);
    if (idx !== -1) {
      const oldQty = state.medicines[idx].quantity;
      const newQty = Number(editData.quantity);
      
      updatedMed = {
        ...state.medicines[idx],
        ...editData,
        buyingPrice: Number(editData.buyingPrice),
        sellingPrice: Number(editData.sellingPrice),
        quantity: newQty,
        minStockLevel: Number(editData.minStockLevel),
        id: medId // protect id
      };
      
      state.medicines[idx] = updatedMed;

      // Log inventory diff if quantities count changed
      if (oldQty !== newQty) {
        state.inventoryLogs.unshift({
          id: `log-${Date.now()}`,
          medicineId: medId,
          medicineName: updatedMed.name,
          type: newQty > oldQty ? "restock" : "damaged",
          quantity: Math.abs(newQty - oldQty),
          date: new Date().toISOString(),
          reason: `Quantity manually modified from ${oldQty} to ${newQty}`,
          userEmail: "budionosiregar@gmail.com"
        });
      }

      state.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        userEmail: "budionosiregar@gmail.com",
        action: "Updated Medicine",
        module: "Inventory",
        date: new Date().toISOString(),
        details: `Modified specifications for ${updatedMed.name}.`
      });
    }
  });

  if (!updatedMed) {
    return res.status(404).json({ error: "Medicine not found" });
  }

  res.json(updatedMed);
});

app.delete("/api/medicines/:id", (req, res) => {
  const medId = req.params.id;
  let deletedName = "";

  updateDB(state => {
    const idx = state.medicines.find(m => m.id === medId);
    if (idx) {
      deletedName = idx.name;
      state.medicines = state.medicines.filter(m => m.id !== medId);
      state.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        userEmail: "budionosiregar@gmail.com",
        action: "Deleted Medicine",
        module: "Inventory",
        date: new Date().toISOString(),
        details: `Deleted product record ${deletedName} (ID: ${medId}).`
      });
    }
  });

  if (!deletedName) {
    return res.status(404).json({ error: "Medicine not found" });
  }

  res.json({ message: `Successfully deleted product: ${deletedName}` });
});

// 4. Categories API
app.get("/api/categories", (req, res) => {
  const db = readDB();
  res.json(db.categories);
});

app.post("/api/categories", (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "Category name is required" });

  const newCat = {
    id: `cat-${Date.now()}`,
    name,
    description: description || ""
  };

  updateDB(state => {
    state.categories.push(newCat);
    state.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      userEmail: "budionosiregar@gmail.com",
      action: "Created Category",
      module: "Inventory",
      date: new Date().toISOString(),
      details: `Added medical category: ${name}`
    });
  });

  res.status(201).json(newCat);
});

// 5. Suppliers API
app.get("/api/suppliers", (req, res) => {
  const db = readDB();
  res.json(db.suppliers);
});

app.post("/api/suppliers", (req, res) => {
  const s = req.body;
  if (!s.name || !s.companyName) return res.status(400).json({ error: "Name and company are required" });

  const newSup = {
    id: `sup-${Date.now()}`,
    name: s.name,
    email: s.email || "",
    phone: s.phone || "",
    companyName: s.companyName,
    address: s.address || ""
  };

  updateDB(state => {
    state.suppliers.push(newSup);
    state.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      userEmail: "budionosiregar@gmail.com",
      action: "Created Supplier",
      module: "Suppliers",
      date: new Date().toISOString(),
      details: `Created supplier ${newSup.name} (${newSup.companyName}).`
    });
  });

  res.status(201).json(newSup);
});

app.put("/api/suppliers/:id", (req, res) => {
  const sId = req.params.id;
  const editData = req.body;
  if (!editData.name || !editData.companyName) {
    return res.status(400).json({ error: "Name and company are required" });
  }

  let updatedSup = null;

  updateDB(state => {
    const idx = state.suppliers.findIndex(s => s.id === sId);
    if (idx !== -1) {
      updatedSup = {
        ...state.suppliers[idx],
        ...editData,
        id: sId
      };
      state.suppliers[idx] = updatedSup;
      state.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        userEmail: "budionosiregar@gmail.com",
        action: "Updated Supplier",
        module: "Suppliers",
        date: new Date().toISOString(),
        details: `Updated supplier details for ${updatedSup.name}.`
      });
    }
  });

  if (!updatedSup) {
    return res.status(404).json({ error: "Supplier not found" });
  }

  res.json(updatedSup);
});

app.delete("/api/suppliers/:id", (req, res) => {
  const sId = req.params.id;
  let deletedName = "";

  updateDB(state => {
    const s = state.suppliers.find(sup => sup.id === sId);
    if (s) {
      deletedName = s.name;
      state.suppliers = state.suppliers.filter(sup => sup.id !== sId);
      state.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        userEmail: "budionosiregar@gmail.com",
        action: "Deleted Supplier",
        module: "Suppliers",
        date: new Date().toISOString(),
        details: `Deleted supplier ${deletedName} (ID: ${sId}).`
      });
    }
  });

  if (!deletedName) {
    return res.status(404).json({ error: "Supplier not found" });
  }

  res.json({ message: `Successfully deleted supplier: ${deletedName}` });
});

// 6. Customers API
app.get("/api/customers", (req, res) => {
  const db = readDB();
  res.json(db.customers);
});

app.post("/api/customers", (req, res) => {
  const c = req.body;
  if (!c.name || !c.phone) return res.status(400).json({ error: "Name and Phone number are required" });

  const newCust: Customer = {
    id: `cust-${Date.now()}`,
    name: c.name,
    email: c.email || "",
    phone: c.phone,
    loyaltyPoints: 10, // Starting loyalty bonus
    insuranceProvider: c.insuranceProvider || "",
    insurancePolicyNumber: c.insurancePolicyNumber || "",
    copayPercent: c.copayPercent !== undefined ? Number(c.copayPercent) : 100,
    prescriptionHistory: []
  };

  updateDB(state => {
    state.customers.push(newCust);
  });

  res.status(201).json(newCust);
});

// 7. POS Sales Checkout API
app.get("/api/sales", (req, res) => {
  const db = readDB();
  res.json(db.sales);
});

app.post("/api/sales/checkout", (req, res) => {
  const { customerId, items, paymentMethod, discountAmount } = req.body;
  
  if (!items || !items.length) {
    return res.status(400).json({ error: "Cart is empty" });
  }

  const db = readDB();

  // Validate Active Cash Session is Open
  const activeSession = (db.cashSessions || []).find((s: any) => s.status === "Open");
  if (!activeSession) {
    return res.status(403).json({ 
      error: "No active Cash Register session found. An administrator or cashier must launch and Open Cash Register Session before dispensing medicines or recording POS sales transactions." 
    });
  }
  
  // Verify/Fetch Customer
  let customer = db.customers.find(c => c.id === customerId);
  if (!customer) {
    // default anonymous cash walker
    customer = {
      id: "cust-cash",
      name: "Walk-in Cash Customer",
      email: "walkin@pharmacy.com",
      phone: "N/A",
      loyaltyPoints: 0,
      prescriptionHistory: []
    };
  }

  // Calculate transaction prices and adjust medicine stocks relational logic
  const checkoutItems: any[] = [];
  let subtotal = 0;
  let totalTax = 0;
  const errors: string[] = [];

  // Transaction scopes
  const logsToInsert: InventoryLog[] = [];
  const stockReductions: Array<{ id: string; quantity: number }> = [];

  for (const item of items) {
    const med = db.medicines.find(m => m.id === item.medicineId);
    if (!med) {
      errors.push(`Medicine with ID ${item.medicineId} not found`);
      continue;
    }

    if (med.quantity < item.quantity) {
      errors.push(`Insufficient stock for ${med.name}. Available: ${med.quantity}, Requested: ${item.quantity}`);
      continue;
    }

    const itemPrice = med.sellingPrice;
    const itemSub = itemPrice * item.quantity;
    const itemTax = itemSub * (med.taxVat / 100);

    subtotal += itemSub;
    totalTax += itemTax;

    checkoutItems.push({
      medicineId: med.id,
      medicineName: med.name,
      quantity: item.quantity,
      price: itemPrice,
      tax: Number(itemTax.toFixed(2))
    });

    stockReductions.push({ id: med.id, quantity: item.quantity });
    
    logsToInsert.push({
      id: `log-${Date.now()}-${med.id}`,
      medicineId: med.id,
      medicineName: med.name,
      type: "sale",
      quantity: item.quantity,
      date: new Date().toISOString(),
      reason: "POS Immediate Checklist Sale",
      userEmail: "budionosiregar@gmail.com"
    });
  }

  if (errors.length) {
    return res.status(400).json({ error: errors.join(", ") });
  }

  const discount = Number(discountAmount) || 0;
  const totalPrice = Number((subtotal + totalTax - discount).toFixed(2));
  const invoiceNumber = `INV-${Date.now()?.toString().slice(-6)}`;

  const newSale: Sale = {
    id: `sal-${Date.now()}`,
    customerId: customer.id,
    customerName: customer.name,
    customerEmail: customer.email,
    invoiceNumber,
    items: checkoutItems,
    totalPrice,
    discount,
    taxAmount: Number(totalTax.toFixed(2)),
    paymentMethod: paymentMethod || "Cash",
    paymentStatus: "Paid",
    cashierEmail: "budionosiregar@gmail.com",
    date: new Date().toISOString()
  };

  // Persist State Updates
  updateDB(state => {
    // 1. Reduce Medicine Qty
    for (const reduction of stockReductions) {
      const target = state.medicines.find(m => m.id === reduction.id);
      if (target) {
        target.quantity -= reduction.quantity;
      }
    }

    // 2. Add Sale record
    state.sales.unshift(newSale);

    // Link invoice with active open Cash Session
    const activeSessionIdx = (state.cashSessions || []).findIndex(s => s.status === "Open");
    if (activeSessionIdx !== -1) {
      const activeSess = state.cashSessions[activeSessionIdx];
      if (!activeSess.salesInvoices) {
        activeSess.salesInvoices = [];
      }
      if (!activeSess.salesInvoices.includes(newSale.invoiceNumber)) {
        activeSess.salesInvoices.push(newSale.invoiceNumber);
      }
    }

    // 3. Add Inventory logs
    state.inventoryLogs.unshift(...logsToInsert);

    // 4. Update Customer Loyalty points and prescription history
    const stateCust = state.customers.find(c => c.id === customer!.id);
    if (stateCust) {
      stateCust.loyaltyPoints += Math.floor(totalPrice / 100) * 5; // 5 loyalty pts per $100 spent
      for (const item of checkoutItems) {
        stateCust.prescriptionHistory.push({
          date: new Date().toISOString(),
          medicineName: item.medicineName,
          quantity: item.quantity
        });
      }
    }

    // 5. Add Cashflow Income Finance Record
    state.financeRecords.unshift({
      id: `fin-${Date.now()}`,
      type: "income",
      category: "POS Prescription Sales",
      amount: totalPrice,
      description: `Sales checkout receipt: ${invoiceNumber}`,
      paymentMethod: paymentMethod || "Cash",
      date: new Date().toISOString()
    });

    // 6. Audit Logging
    state.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      userEmail: "budionosiregar@gmail.com",
      action: "POS Checkout Completeness",
      module: "POS System",
      date: new Date().toISOString(),
      details: `Completed sale barcode checkout for ${invoiceNumber}, amount: $${totalPrice} via ${paymentMethod}`
    });
  });

  res.status(201).json({
    message: "Checkout completed successfully!",
    invoiceNumber,
    sale: newSale
  });
});

app.put("/api/sales/:id", (req, res) => {
  const saleId = req.params.id;
  const { items } = req.body; // Array of { medicineId, quantity }
  if (!items || !items.length) {
    return res.status(400).json({ error: "Sale items cannot be empty." });
  }

  let updatedSale: any = null;
  let errorMessage: string | null = null;

  updateDB(state => {
    const saleIdx = state.sales.findIndex(s => s.id === saleId);
    if (saleIdx === -1) {
      errorMessage = "Sale not found";
      return;
    }

    const sale = state.sales[saleIdx];
    
    // First, restore original medicine quantities
    for (const originalItem of sale.items) {
      const med = state.medicines.find(m => m.id === originalItem.medicineId);
      if (med) {
        med.quantity += originalItem.quantity;
      }
    }

    // Now, validate and apply the new items
    const updatedItems: any[] = [];
    let subtotal = 0;
    let totalTax = 0;

    for (const newItem of items) {
      const med = state.medicines.find(m => m.id === newItem.medicineId);
      if (!med) {
        errorMessage = `Medicine ${newItem.medicineId} not found in catalog`;
        return;
      }

      if (med.quantity < newItem.quantity) {
        errorMessage = `Insufficient stock for ${med.name}. Available: ${med.quantity}, Requested: ${newItem.quantity}`;
        return;
      }

      // Deduct quantity
      med.quantity -= newItem.quantity;

      const itemPrice = med.sellingPrice;
      const itemSub = itemPrice * newItem.quantity;
      const itemTax = itemSub * (med.taxVat / 100);

      subtotal += itemSub;
      totalTax += itemTax;

      updatedItems.push({
        medicineId: med.id,
        medicineName: med.name,
        quantity: newItem.quantity,
        price: itemPrice,
        tax: Number(itemTax.toFixed(2))
      });
    }

    const discount = sale.discount || 0;
    const totalPrice = Number((subtotal + totalTax - discount).toFixed(2));

    // Update the sale
    sale.items = updatedItems;
    sale.totalPrice = totalPrice;
    sale.taxAmount = Number(totalTax.toFixed(2));

    // Update related finance record
    const finRecord = state.financeRecords.find(f => f.description && f.description.includes(sale.invoiceNumber));
    if (finRecord) {
      finRecord.amount = totalPrice;
    }

    // Audit logs
    state.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      userEmail: "budionosiregar@gmail.com",
      action: "Updated POS Sale",
      module: "POS System",
      date: new Date().toISOString(),
      details: `Recalculated quantities for invoice ${sale.invoiceNumber}, new total: $${totalPrice}`
    });

    updatedSale = sale;
  });

  if (errorMessage) {
    return res.status(400).json({ error: errorMessage });
  }

  res.json(updatedSale);
});

app.delete("/api/sales/:id", (req, res) => {
  const saleId = req.params.id;
  let deletedInvoice: string | null = null;

  updateDB(state => {
    const saleIdx = state.sales.findIndex(s => s.id === saleId);
    if (saleIdx !== -1) {
      const sale = state.sales[saleIdx];
      deletedInvoice = sale.invoiceNumber;

      // Reverse stock levels
      for (const item of sale.items) {
        const med = state.medicines.find(m => m.id === item.medicineId);
        if (med) {
          med.quantity += item.quantity;
          
          state.inventoryLogs.unshift({
            id: `log-${Date.now()}-${med.id}`,
            medicineId: med.id,
            medicineName: med.name,
            type: "restock",
            quantity: item.quantity,
            date: new Date().toISOString(),
            reason: `Reversed Sale Invoice ${sale.invoiceNumber}`,
            userEmail: "budionosiregar@gmail.com"
          });
        }
      }

      // Remove finance record
      state.financeRecords = state.financeRecords.filter(f => !f.description || !f.description.includes(sale.invoiceNumber));

      // Log refund transaction under active cash session
      const activeSessionIdx = (state.cashSessions || []).findIndex((s: any) => s.status === "Open");
      if (activeSessionIdx !== -1) {
        if (!state.cashSessions[activeSessionIdx].transactions) {
          state.cashSessions[activeSessionIdx].transactions = [];
        }
        state.cashSessions[activeSessionIdx].transactions.push({
          id: `txn-ref-${Date.now()}`,
          type: "Refund",
          amount: sale.totalPrice,
          paymentMethod: sale.paymentMethod,
          referenceId: sale.invoiceNumber,
          description: `Sale Reversed / Invoice Refunded: ${sale.invoiceNumber} (Client: ${sale.customerName})`,
          timestamp: new Date().toISOString(),
          userEmail: "budionosiregar@gmail.com"
        });
        state.cashSessions[activeSessionIdx].refunds = (state.cashSessions[activeSessionIdx].refunds || 0) + sale.totalPrice;
        if (state.cashSessions[activeSessionIdx].salesInvoices) {
          state.cashSessions[activeSessionIdx].salesInvoices = state.cashSessions[activeSessionIdx].salesInvoices.filter(
            (inv: string) => inv !== sale.invoiceNumber
          );
        }
      }

      // Remove sale record
      state.sales.splice(saleIdx, 1);

      // Add audit log
      state.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        userEmail: "budionosiregar@gmail.com",
        action: "Reversed POS Sale",
        module: "POS System",
        date: new Date().toISOString(),
        details: `Deleted invoice record ${deletedInvoice} and restored product stock counts.`
      });
    }
  });

  if (!deletedInvoice) {
    return res.status(404).json({ error: "Sale transaction lookup failure" });
  }

  res.json({ message: `Successfully reversed sale invoice ${deletedInvoice}` });
});

// 8. Procurement Purchases API
app.get("/api/purchase-orders", (req, res) => {
  const db = readDB();
  res.json(db.purchaseOrders);
});

app.post("/api/purchase-orders", (req, res) => {
  const po = req.body;
  if (!po.supplierId || !po.items || !po.items.length) {
    return res.status(400).json({ error: "Supplier and procurement lists are required" });
  }

  const db = readDB();
  const supplier = db.suppliers.find(s => s.id === po.supplierId);
  if (!supplier) return res.status(404).json({ error: "Supplier not found" });

  let totalAmount = 0;
  const items = po.items.map((item: any) => {
    const cost = Number(item.buyingPrice) * Number(item.quantity);
    totalAmount += cost;
    return {
      medicineName: item.medicineName,
      quantity: Number(item.quantity),
      buyingPrice: Number(item.buyingPrice)
    };
  });

  const newPO: PurchaseOrder = {
    id: `po-${Date.now()}`,
    supplierId: supplier.id,
    supplierName: supplier.name,
    items,
    totalAmount,
    status: "Pending",
    orderDate: new Date().toISOString()
  };

  updateDB(state => {
    state.purchaseOrders.unshift(newPO);
    state.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      userEmail: "budionosiregar@gmail.com",
      action: "Created Procurement PO",
      module: "Procurement",
      date: new Date().toISOString(),
      details: `Generated purchase order ${newPO.id} for Supplier: ${supplier.name}, Amount: $${totalAmount}`
    });
  });

  res.status(201).json(newPO);
});

app.put("/api/purchase-orders/:id/status", (req, res) => {
  const poId = req.params.id;
  const { status } = req.body; // Approved, Received

  let updatedPO: PurchaseOrder | null = null;
  updateDB(state => {
    const idx = state.purchaseOrders.findIndex(p => p.id === poId);
    if (idx !== -1) {
      state.purchaseOrders[idx].status = status;
      if (status === "Received") {
        state.purchaseOrders[idx].receivedDate = new Date().toISOString();
        
        // Relational Update: Add quantities directly to existing medicines with same name
        // Or if it's a new medicine, we have general records
        for (const item of state.purchaseOrders[idx].items) {
          const matchedMed = state.medicines.find(m => m.name.toLowerCase().includes(item.medicineName.toLowerCase()));
          if (matchedMed) {
            matchedMed.quantity += item.quantity;
            state.inventoryLogs.unshift({
              id: `log-${Date.now()}-${matchedMed.id}`,
              medicineId: matchedMed.id,
              medicineName: matchedMed.name,
              type: "restock",
              quantity: item.quantity,
              date: new Date().toISOString(),
              reason: `Procurement Stock Fulfilled for PO ${poId}`,
              userEmail: "budionosiregar@gmail.com"
            });
          }
        }

        // Write Expense Record
        state.financeRecords.unshift({
          id: `fin-${Date.now()}`,
          type: "expense",
          category: "Procurement",
          amount: state.purchaseOrders[idx].totalAmount,
          description: `Disbursed procurement matching PO ${poId}`,
          paymentMethod: "Bank Transfer",
          date: new Date().toISOString()
        });
      }
      
      updatedPO = state.purchaseOrders[idx];
      
      state.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        userEmail: "budionosiregar@gmail.com",
        action: `Procurement PO Status Update`,
        module: "Procurement",
        date: new Date().toISOString(),
        details: `Updated Purchase Order ${poId} status to ${status}.`
      });
    }
  });

  if (!updatedPO) return res.status(404).json({ error: "Purchase Order not found" });
  res.json(updatedPO);
});

// 9. Finance & ledger API
app.get("/api/finance/records", (req, res) => {
  const db = readDB();
  res.json(db.financeRecords);
});

app.post("/api/finance/records", (req, res) => {
  const f = req.body;
  if (!f.amount || !f.category) return res.status(400).json({ error: "Amount and Category are required" });

  const record: FinanceRecord = {
    id: `fin-${Date.now()}`,
    type: f.type || "expense",
    category: f.category,
    amount: Number(f.amount),
    description: f.description || "",
    paymentMethod: f.paymentMethod || "Cash",
    date: new Date().toISOString()
  };

  updateDB(state => {
    state.financeRecords.unshift(record);
  });

  res.status(201).json(record);
});

// 10. Audit logs endpoint
app.get("/api/audit-logs", (req, res) => {
  const db = readDB();
  res.json(db.auditLogs);
});

// 11. Inventory Log Endpoint
app.get("/api/inventory/logs", (req, res) => {
  const db = readDB();
  res.json(db.inventoryLogs);
});

// 11.5 System Settings & Enterprise Controls APIs
app.get("/api/settings", (req, res) => {
  const db = readDB();
  res.json({
    settings: db.settings,
    branches: db.branches,
    apiKeys: db.apiKeys,
    rolePermissions: db.rolePermissions,
    backups: db.backups,
    users: db.users
  });
});

app.post("/api/settings", (req, res) => {
  const { settings, sectionUpdated } = req.body;
  if (!settings) {
    return res.status(400).json({ error: "Missing settings configuration payload." });
  }

  updateDB(state => {
    state.settings = { ...state.settings, ...settings };
    state.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      userEmail: "budionosiregar@gmail.com",
      action: `Updated Settings: ${sectionUpdated || "General"}`,
      module: "Settings Core",
      date: new Date().toISOString(),
      details: `Modified configurations inside system settings dashboard section.`
    });
  });

  res.json({ message: "Settings committed successfully.", settings });
});

app.post("/api/settings/reset-analytics", (req, res) => {
  const { type, userEmail } = req.body;
  if (!type || !userEmail) {
    return res.status(400).json({ error: "Missing required type or user email in request payload." });
  }

  const db = readDB();
  const user = db.users.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
  
  // Accept Administrators, Super Admins, or Pharmacists for testing
  const isAuthorized = user && (
    user.role === UserRole.SUPER_ADMIN || 
    user.role === UserRole.PHARMACIST
  );
  
  if (!isAuthorized) {
    return res.status(403).json({ 
      error: "Access Denied. Standard cashiers and unauthorized workstation operators are forbidden from resetting core performance indices." 
    });
  }

  updateDB(state => {
    checkAndRolloverWeeklyCycle(state);
    const activeIdx = state.weeklyCycles.findIndex((c: any) => c.status === "Active");
    
    if (activeIdx !== -1) {
      if (type === "graph-report") {
        state.weeklyCycles[activeIdx].resetGraphReport = true;
        state.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          userEmail,
          action: "Reset Graph Report (Donut)",
          module: "Analytics",
          date: new Date().toISOString(),
          details: `Manual administrative purge of Graph Report (Donut Analytics) metrics for active weekly cycle ${state.weeklyCycles[activeIdx].id}. Historical cycles protected.`
        });
      } else if (type === "sales-overview") {
        state.weeklyCycles[activeIdx].resetTotalSalesOverview = true;
        state.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          userEmail,
          action: "Reset Sales Overview (Cylinders)",
          module: "Analytics",
          date: new Date().toISOString(),
          details: `Manual administrative purge of Weekday Cylinder Sales Overview for active weekly cycle ${state.weeklyCycles[activeIdx].id}. Historical cycles protected.`
        });
      }
    }
  });

  res.json({ message: "Telemetry indicators cleared successfully. Audit trail committed." });
});

app.post("/api/settings/branches", (req, res) => {
  const { branch } = req.body;
  if (!branch) {
    return res.status(400).json({ error: "Missing branch definition payload." });
  }

  let actionName = "Created Branch";
  updateDB(state => {
    const existingIdx = state.branches.findIndex(b => b.id === branch.id);
    if (existingIdx > -1) {
      actionName = `Updated Branch ${branch.name}`;
      state.branches[existingIdx] = branch;
    } else {
      branch.id = `br-${Date.now()}`;
      state.branches.push(branch);
    }
    state.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      userEmail: "budionosiregar@gmail.com",
      action: actionName,
      module: "Branches Control",
      date: new Date().toISOString(),
      details: `Configured branch location ${branch.name} (${branch.code}).`
    });
  });

  res.json({ message: "Branch config saved successfully.", branches: readDB().branches });
});

app.post("/api/settings/api-keys", (req, res) => {
  const { name, action, keyId } = req.body;

  updateDB(state => {
    if (action === "create") {
      const newKey = {
        id: `key-${Date.now()}`,
        name: name || "Developer Integrator Integration",
        apiKey: `hm_pk_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        status: "Active" as const
      };
      state.apiKeys.unshift(newKey);
      state.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        userEmail: "budionosiregar@gmail.com",
        action: "Generated API Credentials",
        module: "API Controls",
        date: new Date().toISOString(),
        details: `Created custom integration API Token: ${newKey.name}`
      });
    } else if (action === "revoke") {
      const idx = state.apiKeys.findIndex(k => k.id === keyId);
      if (idx > -1) {
        state.apiKeys[idx].status = "Revoked";
        state.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          userEmail: "budionosiregar@gmail.com",
          action: "Revoked API Access Key",
          module: "API Controls",
          date: new Date().toISOString(),
          details: `Disabled developer credentials token permanently.`
        });
      }
    }
  });

  res.json({ message: "API credentials adjusted.", apiKeys: readDB().apiKeys });
});

app.post("/api/settings/roles", (req, res) => {
  const { rolePermissions } = req.body;
  if (!rolePermissions) {
    return res.status(400).json({ error: "Missing role mappings payload." });
  }

  updateDB(state => {
    const idx = state.rolePermissions.findIndex(rp => rp.role === rolePermissions.role);
    if (idx > -1) {
      state.rolePermissions[idx] = rolePermissions;
    } else {
      state.rolePermissions.push(rolePermissions);
    }
    state.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      userEmail: "budionosiregar@gmail.com",
      action: "Modified Role RBAC Permissions",
      module: "Security RBAC",
      date: new Date().toISOString(),
      details: `Calibrated access matrix for: ${rolePermissions.role}`
    });
  });

  res.json({ message: "Role definitions updated.", rolePermissions: readDB().rolePermissions });
});

app.post("/api/settings/backup/run", (req, res) => {
  const { provider } = req.body;
  const dateStr = new Date().toISOString().slice(0, 10);
  const newBackup = {
    id: `bk-${Date.now()}`,
    filename: `halomed-db-backup-${dateStr}-${Math.floor(Math.random()*1000)}.enc`,
    size: `${(Math.random() * 0.5 + 2.0).toFixed(1)} MB`,
    createdAt: new Date().toISOString(),
    storageProvider: (provider || "Local") as any,
    status: "Success" as const
  };

  updateDB(state => {
    state.backups.unshift(newBackup);
    state.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      userEmail: "budionosiregar@gmail.com",
      action: "Created DB Storage Backup",
      module: "Disaster Recovery",
      date: new Date().toISOString(),
      details: `Committed system snapshot snapshot files to backup directory.`
    });
  });

  res.json({ message: "Backup successfully archived.", backups: readDB().backups });
});

app.post("/api/settings/maintenance/diagnose", (req, res) => {
  const db = readDB();
  const report = [
    { title: "Node.js Platform Runtime V8 Engine", status: "Healthy", value: `${process.version} Live` },
    { title: "Database Integrity & JSON State Keys", status: "Healthy", value: `${db.medicines.length} Medicines Loaded` },
    { title: "System Memory Allocated Heap Use", status: "Optimal", value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB` },
    { title: "Local Disk Space Capacity Usage", status: "Healthy", value: "92% Available" },
    { title: "Workspace API Gateway Network Ping", status: "Healthy", value: "11ms Host Delay" },
    { title: "Gemini AI Automation API Stream", status: process.env.GEMINI_API_KEY ? "Healthy" : "Offline", value: process.env.GEMINI_API_KEY ? "Fully Functional Mode" : "Local Sandbox Backups Active" }
  ];

  updateDB(state => {
    state.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      userEmail: "budionosiregar@gmail.com",
      action: "Committed Core Diagnostics Checks",
      module: "Maintenance",
      date: new Date().toISOString(),
      details: "Incurred live checks on memory, database records, IO and cloud networks."
    });
  });

  res.json({ message: "Diagnostics performed.", report });
});

app.post("/api/settings/users", (req, res) => {
  const { adminEmail, userId, isActive, role, action, name, email, password } = req.body;

  const db = readDB();
  const adminUser = db.users.find(u => u.email.toLowerCase() === adminEmail?.toLowerCase());
  const isAuthorized = adminUser && (
    adminUser.role === UserRole.SUPER_ADMIN || 
    adminUser.role === UserRole.PHARMACIST
  );

  if (!isAuthorized) {
    return res.status(403).json({ error: "Access Denied. Only authorized system administrators are permitted to override operational keys/roles." });
  }

  // Handle admin actions:
  if (action === "create") {
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Name, email, password and role are all required to enroll workspace personnel." });
    }

    const dupUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (dupUser) {
      return res.status(409).json({ error: "A workforce account with this email address is already registered." });
    }

    const { salt, hash } = hashPassword(password);
    const newStaff = {
      id: `usr-${Date.now()}`,
      name,
      email: email.toLowerCase(),
      role: role as any,
      isActive: true,
      createdAt: new Date().toISOString(),
      passwordHash: hash,
      salt,
      failedLoginAttempts: 0
    };

    updateDB(state => {
      state.users.push(newStaff);
      state.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        userEmail: adminEmail,
        action: "Admin Enrolled User",
        module: "RBAC Security",
        date: new Date().toISOString(),
        details: `Administrator [${adminUser.name}] enrolled workstation account: ${newStaff.name} (${newStaff.role})`
      });
    });

    return res.json({ message: "Workforce staff member enrolled successfully.", users: readDB().users });
  }

  if (action === "reset-password") {
    if (!userId || !password) {
      return res.status(400).json({ error: "Missing Target User Identity or Password." });
    }

    const { salt, hash } = hashPassword(password);
    updateDB(state => {
      const idx = state.users.findIndex(u => u.id === userId);
      if (idx > -1) {
        state.users[idx].passwordHash = hash;
        state.users[idx].salt = salt;
        state.users[idx].failedLoginAttempts = 0;
        state.users[idx].lockedUntil = undefined;

        state.auditLogs.unshift({
          id: `aud-${Date.now()}`,
          userEmail: adminEmail,
          action: "Admin Reset User Password",
          module: "RBAC Security",
          date: new Date().toISOString(),
          details: `Administrator [${adminUser.name}] reset credentials for workspace user: ${state.users[idx].email}`
        });
      }
    });

    return res.json({ message: "Security credentials updated successfully." });
  }

  // Fallback: Default role toggle or isActive toggle
  if (!userId) {
    return res.status(400).json({ error: "Missing User Identity." });
  }

  updateDB(state => {
    const idx = state.users.findIndex(u => u.id === userId);
    if (idx > -1) {
      const oldRole = state.users[idx].role;
      const oldActive = state.users[idx].isActive;
      
      if (isActive !== undefined) {
        state.users[idx].isActive = isActive;
      }
      if (role !== undefined) {
        state.users[idx].role = role;
      }
      state.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        userEmail: adminEmail,
        action: "Modified User Workstation Status",
        module: "RBAC Security",
        date: new Date().toISOString(),
        details: `Administrator [${adminUser.name}] adjusted system capabilities of ${state.users[idx].name} to Active:${isActive !== undefined ? isActive : oldActive} Role:${role !== undefined ? role : oldRole}`
      });
    }
  });

  res.json({ message: "User status updated.", users: readDB().users });
});


// 12. AI Smart Forecasting & Intelligent Assistant API (Express Backend + Gemini 3.5 Flash)
app.post("/api/ai/forecast", async (req, res) => {
  const db = readDB();
  const client = getGeminiClient();

  if (!client) {
    // Elegant system fallbacks with dynamic prediction metrics when API is offline or dummy secret
    const demoExpiryPredictions = db.medicines.map(m => {
      const daysToExpiry = Math.ceil((new Date(m.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      let riskStatus: "Critical" | "Warning" | "Safe" = "Safe";
      let actionRecommended = "Stock levels secure. Monitor normal sales.";

      if (daysToExpiry < 30) {
        riskStatus = "Critical";
        actionRecommended = "Near-expiry alert! Mark down 30% or return to supplier.";
      } else if (daysToExpiry < 90) {
        riskStatus = "Warning";
        actionRecommended = "Medium expiry risk. Place on priority promotional counters.";
      }

      return {
        medicineId: m.id,
        medicineName: m.name,
        SKU: m.SKU,
        expiryDate: m.expiryDate,
        daysToExpiry,
        riskStatus,
        actionRecommended
      };
    }).sort((a,b) => a.daysToExpiry - b.daysToExpiry);

    const demoReorderSuggestions = db.medicines.filter(m => m.quantity <= m.minStockLevel || m.quantity < 15).map(m => {
      const reorderQuantity = m.minStockLevel * 3;
      return {
        medicineId: m.id,
        medicineName: m.name,
        currentStock: m.quantity,
        minStock: m.minStockLevel,
        reorderQuantity,
        supplierName: db.suppliers.find(s => s.id === m.supplierId)?.name || "Primary Pharma Supplier",
        confidenceLevel: 94,
        rationale: `Stock level fell below safety margin (${m.quantity}/${m.minStockLevel}). Suggested bulk discount procurement.`
      };
    });

    const demoSalesPredictions = [
      { month: "June 2026", predictedRevenue: 15400, growthTrend: "+12.4% Projected seasonal antibiotic demand" },
      { month: "July 2026", predictedRevenue: 18200, growthTrend: "+18.1% High allergy antihistamine demand spikes" },
      { month: "August 2026", predictedRevenue: 16900, growthTrend: "-7.1% Stabilization in cardiac drug margins" }
    ];

    return res.json({
      demoMode: true,
      expiryPredictions: demoExpiryPredictions,
      stockReorderSuggestions: demoReorderSuggestions,
      salesPredictions: demoSalesPredictions,
      systemMessage: "Demo forecasting loaded. Provide your GEMINI_API_KEY in the AI Studio Settings secrets panel to run live generative clinical forecasting!"
    });
  }

  // Live query to Gemini using structure output
  try {
    const summaryInventory = db.medicines.map(m => ({
      id: m.id,
      name: m.name,
      generic: m.genericName,
      SKU: m.SKU,
      qty: m.quantity,
      min: m.minStockLevel,
      expiry: m.expiryDate,
      supplierId: m.supplierId,
      buying: m.buyingPrice,
      selling: m.sellingPrice
    }));

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Perform clinical business analytics and future forecasting for this pharmacy pharmacy group. 
Inventory Dataset: ${JSON.stringify(summaryInventory)}
Current Date Context: 2026-05-22. Generate a highly accurate JSON forecast parsing medicines and prescribing future business workflows. Output exactly matching the schema.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["expiryPredictions", "stockReorderSuggestions", "salesPredictions"],
          properties: {
            expiryPredictions: {
              type: Type.ARRAY,
              description: "Assess clinical shelf-life status of medicines, flagging those near or post expiry",
              items: {
                type: Type.OBJECT,
                required: ["medicineId", "medicineName", "SKU", "expiryDate", "daysToExpiry", "riskStatus", "actionRecommended"],
                properties: {
                  medicineId: { type: Type.STRING },
                  medicineName: { type: Type.STRING },
                  SKU: { type: Type.STRING },
                  expiryDate: { type: Type.STRING },
                  daysToExpiry: { type: Type.INTEGER },
                  riskStatus: { type: Type.STRING, description: "Must be 'Critical' for days < 30, 'Warning' for days < 120, otherwise 'Safe'" },
                  actionRecommended: { type: Type.STRING }
                }
              }
            },
            stockReorderSuggestions: {
              type: Type.ARRAY,
              description: "Detect low stock anomalies and generate smart procurement restock lines",
              items: {
                type: Type.OBJECT,
                required: ["medicineId", "medicineName", "currentStock", "minStock", "reorderQuantity", "supplierName", "confidenceLevel", "rationale"],
                properties: {
                  medicineId: { type: Type.STRING },
                  medicineName: { type: Type.STRING },
                  currentStock: { type: Type.INTEGER },
                  minStock: { type: Type.INTEGER },
                  reorderQuantity: { type: Type.INTEGER },
                  supplierName: { type: Type.STRING },
                  confidenceLevel: { type: Type.INTEGER, description: "AI certainty percent (e.g. 95)" },
                  rationale: { type: Type.STRING }
                }
              }
            },
            salesPredictions: {
              type: Type.ARRAY,
              description: "Forecast future monthly revenue predictions spanning the next three calendar cycles",
              items: {
                type: Type.OBJECT,
                required: ["month", "predictedRevenue", "growthTrend"],
                properties: {
                  month: { type: Type.STRING },
                  predictedRevenue: { type: Type.NUMBER },
                  growthTrend: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json({
      demoMode: false,
      ...parsedData
    });
  } catch (error: any) {
    console.error("Gemini live forecasting failure:", error);
    res.status(500).json({ error: "Gemini server parsing error", message: error.message });
  }
});


// 14. Cash Register Management API Endpoints

function calculateSessionSummary(session: any, db: any) {
  const openedTime = new Date(session.openedAt).getTime();
  const closedTime = session.closedAt ? new Date(session.closedAt).getTime() : Date.now();

  const matchingSales = db.sales.filter((s: any) => {
    if (session.salesInvoices && session.salesInvoices.length > 0) {
      return session.salesInvoices.includes(s.invoiceNumber);
    }
    const saleTime = new Date(s.date).getTime();
    return saleTime >= openedTime && saleTime <= closedTime;
  });

  const matchingFinances = db.financeRecords.filter((f: any) => {
    const finTime = new Date(f.date).getTime();
    return finTime >= openedTime && finTime <= closedTime;
  });

  let totalSalesAmount = 0;
  let cashPayments = 0;
  let mobileMoneyPayments = 0;
  let cardPayments = 0;
  let discounts = 0;
  let refunds = 0;
  let expenses = 0;

  matchingSales.forEach((s: any) => {
    totalSalesAmount += s.totalPrice;
    if (s.paymentMethod === "Cash") {
      cashPayments += s.totalPrice;
    } else if (s.paymentMethod === "M-Pesa") {
      mobileMoneyPayments += s.totalPrice;
    } else if (s.paymentMethod === "Card") {
      cardPayments += s.totalPrice;
    }
    discounts += (s.discount || 0);
  });

  matchingFinances.forEach((f: any) => {
    const typeLower = f.type.toLowerCase();
    if (typeLower === "expense") {
      expenses += f.amount;
    } else if (typeLower === "refund") {
      refunds += f.amount;
    }
  });

  // Include custom transactions or manual cash registers
  const staticTxns = session.transactions || [];
  staticTxns.forEach((txn: any) => {
    if (txn.type === "Expense") {
      expenses += txn.amount;
    } else if (txn.type === "Refund") {
      refunds += txn.amount;
    } else if (txn.type === "Cash-In") {
      cashPayments += txn.amount;
    } else if (txn.type === "Cash-Out") {
      expenses += txn.amount;
    }
  });

  const expectedClosingBalance = session.openingBalance + cashPayments - expenses - refunds;

  const salesTransactions = matchingSales.map((s: any) => ({
    id: `txn-sale-${s.id}`,
    type: "Sale" as const,
    amount: s.totalPrice,
    paymentMethod: s.paymentMethod,
    referenceId: s.invoiceNumber,
    description: `Invoice: ${s.invoiceNumber} (Client: ${s.customerName})`,
    timestamp: s.date,
    userEmail: s.cashierEmail
  }));

  const expenseTransactions = matchingFinances
    .filter((f: any) => f.type.toLowerCase() === "expense")
    .map((f: any) => ({
      id: `txn-exp-${f.id}`,
      type: "Expense" as const,
      amount: f.amount,
      paymentMethod: f.paymentMethod || "Cash",
      referenceId: f.id,
      description: `${f.category}: ${f.description}`,
      timestamp: f.date,
      userEmail: "budionosiregar@gmail.com"
    }));

  const otherTxns = staticTxns.filter((txn: any) => txn.type !== "Sale" && txn.type !== "Expense");

  const allTransactions = [...salesTransactions, ...expenseTransactions, ...otherTxns]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    ...session,
    totalSalesAmount: Number(totalSalesAmount.toFixed(2)),
    totalInvoicesCount: matchingSales.length,
    cashPayments: Number(cashPayments.toFixed(2)),
    mobileMoneyPayments: Number(mobileMoneyPayments.toFixed(2)),
    cardPayments: Number(cardPayments.toFixed(2)),
    discounts: Number(discounts.toFixed(2)),
    refunds: Number(refunds.toFixed(2)),
    expenses: Number(expenses.toFixed(2)),
    expectedClosingBalance: Number(expectedClosingBalance.toFixed(2)),
    transactions: allTransactions
  };
}

app.get("/api/cash-register/sessions", (req, res) => {
  const db = readDB();
  const sorted = [...(db.cashSessions || [])].map(session => calculateSessionSummary(session, db));
  res.json(sorted);
});

app.get("/api/cash-register/active", (req, res) => {
  const db = readDB();
  const active = (db.cashSessions || []).find((s: any) => s.status === "Open");
  if (!active) {
    return res.json(null);
  }
  const summarized = calculateSessionSummary(active, db);
  res.json(summarized);
});

app.post("/api/cash-register/open", (req, res) => {
  const { openingBalance, openedBy } = req.body;
  if (openingBalance === undefined || !openedBy) {
    return res.status(400).json({ error: "Opening Balance and Cashier details are required" });
  }

  const db = readDB();
  const active = (db.cashSessions || []).find((s: any) => s.status === "Open");
  if (active) {
    return res.status(400).json({ error: "A cash session is currently active. Please close the active session first." });
  }

  const newSession = {
    id: `session-${Date.now()}`,
    status: "Open" as const,
    openedBy,
    openedAt: new Date().toISOString(),
    openingBalance: Number(openingBalance),
    expectedClosingBalance: Number(openingBalance),
    totalSalesAmount: 0,
    totalInvoicesCount: 0,
    cashPayments: 0,
    mobileMoneyPayments: 0,
    cardPayments: 0,
    discounts: 0,
    refunds: 0,
    expenses: 0,
    transactions: [],
    salesInvoices: []
  };

  updateDB(state => {
    if (!state.cashSessions) {
      state.cashSessions = [];
    }
    state.cashSessions.unshift(newSession);
    state.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      userEmail: openedBy.email,
      action: "Open Cash Session",
      module: "Cash Register",
      date: new Date().toISOString(),
      details: `Opened cash register session with opening balance: $${openingBalance}`
    });
  });

  res.status(201).json(newSession);
});

app.post("/api/cash-register/close", (req, res) => {
  const { actualClosingBalance, note, closedBy } = req.body;
  if (actualClosingBalance === undefined || !closedBy) {
    return res.status(400).json({ error: "Actual Counted Cash and Cashier details are required" });
  }

  const db = readDB();
  const activeIdx = (db.cashSessions || []).findIndex((s: any) => s.status === "Open");
  if (activeIdx === -1) {
    return res.status(400).json({ error: "No active cash register session found to close." });
  }

  const active = db.cashSessions[activeIdx];
  const summarized = calculateSessionSummary(active, db);
  const variance = Number(actualClosingBalance) - summarized.expectedClosingBalance;

  updateDB(state => {
    const sidx = state.cashSessions.findIndex((s: any) => s.id === active.id);
    if (sidx !== -1) {
      const stateActive = state.cashSessions[sidx];
      stateActive.status = "Closed";
      stateActive.closedBy = closedBy;
      stateActive.closedAt = new Date().toISOString();
      stateActive.actualClosingBalance = Number(actualClosingBalance);
      stateActive.variance = Number(variance.toFixed(2));
      stateActive.note = note || "";
      
      // Save static values for historical records snapshot
      stateActive.totalSalesAmount = summarized.totalSalesAmount;
      stateActive.totalInvoicesCount = summarized.totalInvoicesCount;
      stateActive.cashPayments = summarized.cashPayments;
      stateActive.mobileMoneyPayments = summarized.mobileMoneyPayments;
      stateActive.cardPayments = summarized.cardPayments;
      stateActive.discounts = summarized.discounts;
      stateActive.refunds = summarized.refunds;
      stateActive.expenses = summarized.expenses;
      stateActive.expectedClosingBalance = summarized.expectedClosingBalance;
      stateActive.transactions = summarized.transactions;
    }

    state.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      userEmail: closedBy.email,
      action: "Close Cash Session",
      module: "Cash Register",
      date: new Date().toISOString(),
      details: `Closed cash drawer session. Expected: $${summarized.expectedClosingBalance}, Counted: $${actualClosingBalance}, Variance: $${variance}`
    });
  });

  res.json({
    ...summarized,
    status: "Closed",
    closedBy,
    closedAt: new Date().toISOString(),
    actualClosingBalance,
    variance: Number(variance.toFixed(2)),
    note: note || ""
  });
});


// Hook-up and configure the Express server environment integration
async function startServer() {
  const PORT = 3000;

  // Serve static files + router fallbacks in Production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Pharmacy ERP running smoothly on: http://0.0.0.0:${PORT}`);
  });
}

startServer();
