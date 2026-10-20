import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, differenceInYears } from "date-fns";

/**
 * Tailwind CSS class merge utility (clsx + tailwind-merge).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Generate an invoice number in "INV-YYYY-XXXX" format.
 */
export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000); // 4-digit number
  return `INV-${year}-${random}`;
}

/**
 * Generate a transaction ID in "TXN-XXXXXXXXXXXX" format (12 hex chars).
 */
export function generateTransactionId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TXN-${id}`;
}

/**
 * Format a date as "MMM dd, yyyy" (e.g. "Jan 15, 2025").
 */
export function formatDate(date: Date): string {
  return format(date, "MMM dd, yyyy");
}

/**
 * Application currency configuration. The clinic operates in Turkish Lira (₺).
 */
export const CURRENCY_CODE = "TRY";
export const CURRENCY_SYMBOL = "₺";
export const CURRENCY_LOCALE = "tr-TR";

/**
 * Format a numeric amount as Turkish Lira (e.g. 250 → "₺250,00").
 * Falls back to a symbol-prefixed string if Intl is unavailable.
 */
export function formatCurrency(
  amount: number | null | undefined,
  options?: { decimals?: number }
): string {
  const value = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  const decimals = options?.decimals ?? 2;
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE, {
      style: "currency",
      currency: CURRENCY_CODE,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    return `${CURRENCY_SYMBOL}${value.toFixed(decimals)}`;
  }
}

/**
 * Calculate age in whole years from a date of birth.
 */
export function calculateAge(dateOfBirth: Date): number {
  return differenceInYears(new Date(), dateOfBirth);
}

/**
 * Return compatible donor blood types for a given recipient blood type.
 */
export function getBloodTypeCompatibility(bloodType: string): string[] {
  const compatibility: Record<string, string[]> = {
    "A+": ["A+", "A-", "O+", "O-"],
    "A-": ["A-", "O-"],
    "B+": ["B+", "B-", "O+", "O-"],
    "B-": ["B-", "O-"],
    "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    "AB-": ["A-", "B-", "AB-", "O-"],
    "O+": ["O+", "O-"],
    "O-": ["O-"],
  };

  return compatibility[bloodType] ?? [];
}
