/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Parses any date value safely and returns a Date object.
 * If the value is invalid or null, returns null.
 */
export function parseSafeDate(dateVal: any): Date | null {
  if (!dateVal) return null;
  
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) {
      return null;
    }
    return d;
  } catch (e) {
    console.error("parseSafeDate error parsing:", dateVal, e);
    return null;
  }
}

/**
 * Returns a robust ISO string prefix (e.g. YYYY-MM-DD) or fallback
 */
export function safeToISOString(dateVal: any, fallback = "N/A"): string {
  const d = parseSafeDate(dateVal);
  if (!d) return fallback;
  try {
    return d.toISOString();
  } catch (e) {
    return fallback;
  }
}

/**
 * Formats date cleanly as "YYYY-MM-DD HH:MM:SS" or customized format
 */
export function formatSafeDateTime(dateVal: any, fallback = "N/A"): string {
  const d = parseSafeDate(dateVal);
  if (!d) return fallback;
  
  try {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    
    const activeFormat = localStorage.getItem("halomedical_date_format") || "YYYY-MM-DD";
    let formattedDate = `${year}-${month}-${day}`;
    if (activeFormat === "DD/MM/YYYY") {
      formattedDate = `${day}/${month}/${year}`;
    } else if (activeFormat === "MM/DD/YYYY") {
      formattedDate = `${month}/${day}/${year}`;
    }
    return `${formattedDate} ${hours}:${minutes}:${seconds}`;
  } catch (e) {
    return fallback;
  }
}

/**
 * Formats date as "YYYY-MM-DD" safely or customized format
 */
export function formatSafeDateOnly(dateVal: any, fallback = "N/A"): string {
  const d = parseSafeDate(dateVal);
  if (!d) return fallback;
  try {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    
    const activeFormat = localStorage.getItem("halomedical_date_format") || "YYYY-MM-DD";
    if (activeFormat === "DD/MM/YYYY") {
      return `${day}/${month}/${year}`;
    } else if (activeFormat === "MM/DD/YYYY") {
      return `${month}/${day}/${year}`;
    }
    return `${year}-${month}-${day}`;
  } catch (e) {
    return fallback;
  }
}

/**
 * Checks if a given expiration date is in the past.
 * Safely compares with the current date, defaulting to false if parsing fails.
 */
export function isDateExpired(expiryDate: any): boolean {
  const d = parseSafeDate(expiryDate);
  if (!d) return false;
  return d.getTime() < Date.now();
}

/**
 * Calculates remaining days from today to an expiry date.
 * Returns negative if the date has passed.
 */
export function getDaysToExpiry(expiryDate: any): number {
  const expiry = parseSafeDate(expiryDate);
  if (!expiry) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const target = new Date(expiry.getTime());
  target.setHours(0, 0, 0, 0);
  
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Returns color-coded expiry status: 'expired' (<= 0 days), 'near' (<= warningPeriodDays), or 'safe'
 */
export function getExpiryStatus(expiryDate: any, warningPeriodDays = 45): "expired" | "near-expiry" | "safe" {
  const days = getDaysToExpiry(expiryDate);
  if (days <= 0) return "expired";
  if (days <= warningPeriodDays) return "near-expiry";
  return "safe";
}

/**
 * Formats a given number into professional currency layout (e.g. Ksh. 1,500.00).
 * Space is included after the currency symbol.
 */
export function formatCurrency(amount: number, symbol = "Ksh.", precision = 2): string {
  const safeAmount = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  const formattedSymbol = symbol && !symbol.endsWith(" ") ? `${symbol} ` : symbol || "";
  const formattedNumber = safeAmount.toLocaleString("en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
  return `${formattedSymbol}${formattedNumber}`;
}

interface ProfileCompletionUser {
  avatarUrl?: string;
  name?: string;
  email?: string;
  phone?: string;
  nationalId?: string;
  address?: string;
  passwordSetupCompleted?: boolean;
  role?: string;
}

/**
 * Professional, clean default SVG avatar for operators without a custom uploaded profile picture.
 */
export const DEFAULT_PROFESSIONAL_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230d9488' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><rect width='24' height='24' rx='12' fill='%23ccfbf1'/><circle cx='12' cy='10' r='4' fill='%2399f6e4' stroke='%232dd4bf' stroke-width='1.5'/><path d='M12 14c-4 0-6 2-6 4v1h12v-1c0-2-2-4-6-4z' fill='%2399f6e4' stroke='%232dd4bf' stroke-width='1.5'/></svg>";

/**
 * Resolve avatar URL to the professional default fallback if missing or placeholder.
 */
export function getAvatarUrl(avatarUrl: string | undefined | null): string {
  if (!avatarUrl) {
    return DEFAULT_PROFESSIONAL_AVATAR;
  }
  const lowerUrl = avatarUrl.toLowerCase();
  if (
    lowerUrl.includes("photo-1535713875002-d1d0cf377fde") || 
    lowerUrl.includes("photo-1534528741775-53994a69daeb")
  ) {
    return DEFAULT_PROFESSIONAL_AVATAR;
  }
  return avatarUrl;
}

/**
 * Computes profile completion progress based on 8 key benchmarks:
 * Name, Email, Phone, National ID, Address, Custom Password, and assigned Role.
 * Note: Avatar / profile picture is completely optional and excluded from calculations.
 */
export function calculateProfileCompletion(user: ProfileCompletionUser | null): {
  percent: number;
  criteria: Record<string, boolean>;
  missing: string[];
} {
  if (!user) {
    return {
      percent: 0,
      criteria: {},
      missing: ["Session unrecognized"]
    };
  }

  // Standard placeholder avatar detection
  const hasAvatar = !!user.avatarUrl && 
    !user.avatarUrl.includes("photo-1535713875002-d1d0cf377fde") &&
    !user.avatarUrl.includes("photo-1534528741775-53994a69daeb") &&
    !user.avatarUrl.includes("data:image/svg+xml");

  const hasName = !!user.name && user.name.trim().length > 1;
  const hasEmail = !!user.email && user.email.trim().length > 3;
  const hasPhone = !!user.phone && user.phone.trim().length >= 7;
  const hasNationalId = !!user.nationalId && user.nationalId.trim().length >= 4;
  const hasAddress = !!user.address && user.address.trim().length >= 5;
  const hasPassword = !!user.passwordSetupCompleted;
  const hasRole = !!user.role;

  // Avatar is fully optional and excluded from percent calculation
  const steps = [
    { key: "name", label: "Full Corporate Name", val: hasName },
    { key: "email", label: "Verified Email Address", val: hasEmail },
    { key: "phone", label: "Direct Phone Number", val: hasPhone },
    { key: "nationalId", label: "National ID / Passport No.", val: hasNationalId },
    { key: "address", label: "Residence/Operational Address", val: hasAddress },
    { key: "password", label: "Master Cryptographic Password", val: hasPassword },
    { key: "role", label: "Assigned Structural Role", val: hasRole }
  ];

  const criteria: Record<string, boolean> = {
    avatar: hasAvatar
  };
  const missing: string[] = [];
  let completedCount = 0;

  for (const step of steps) {
    criteria[step.key] = step.val;
    if (step.val) {
      completedCount++;
    } else {
      missing.push(step.label);
    }
  }

  const percent = Math.round((completedCount / steps.length) * 100);

  return {
    percent,
    criteria,
    missing
  };
}

