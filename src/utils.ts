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
 * Formats date cleanly as "YYYY-MM-DD HH:MM:SS" or fallback
 */
export function formatSafeDateTime(dateVal: any, fallback = "N/A"): string {
  const d = parseSafeDate(dateVal);
  if (!d) return fallback;
  
  try {
    const iso = d.toISOString();
    return iso.replace("T", " ").slice(0, 19);
  } catch (e) {
    return fallback;
  }
}

/**
 * Formats date as "YYYY-MM-DD" safely
 */
export function formatSafeDateOnly(dateVal: any, fallback = "N/A"): string {
  const d = parseSafeDate(dateVal);
  if (!d) return fallback;
  try {
    const iso = d.toISOString();
    return iso.slice(0, 10);
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
