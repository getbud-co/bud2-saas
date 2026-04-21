/**
 * Date formatting utilities for display
 *
 * PRINCIPLE: Store ISO, Display Local
 * - Storage (localStorage): ISO 8601 format (YYYY-MM-DD or full ISO datetime)
 * - Display (UI): Brazilian format (DD/MM/YYYY)
 *
 * This module centralizes all date formatting to avoid duplication
 * and ensure consistent formatting across the application.
 */

// Re-export DS type for CalendarDate compatibility
export type { CalendarDate } from "@getbud-co/buds";

/**
 * Format ISO date string (YYYY-MM-DD or ISO datetime) to Brazilian format (DD/MM/YYYY)
 * @param isoDate - ISO format date string or null/undefined
 * @returns Formatted date string or empty string if invalid
 */
export function formatDateBR(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR");
}

/**
 * Format ISO date string to short format (DD/MM) - useful for charts and compact displays
 * @param isoDate - ISO format date string
 * @returns Short formatted date (DD/MM)
 */
export function formatDateShort(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

/**
 * Format relative time in Portuguese (e.g., "Agora", "Há 2 minutos", "Há 3 dias")
 * Falls back to full date format for older dates (> 7 days)
 * @param isoDateTime - ISO format datetime string
 * @returns Relative time string in Portuguese
 */
export function formatRelativeTime(isoDateTime: string | null | undefined): string {
  if (!isoDateTime) return "";
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "Agora";
  if (diffMinutes < 60) return `Há ${diffMinutes} ${diffMinutes === 1 ? "minuto" : "minutos"}`;
  if (diffHours < 24) return `Há ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
  if (diffDays < 7) return `Há ${diffDays} ${diffDays === 1 ? "dia" : "dias"}`;

  return formatDateBR(isoDateTime);
}

/**
 * Format weekday, day and month (e.g., "Segunda-feira, 15 de março")
 * Useful for greeting cards and headers
 * @param date - Date object (defaults to today)
 * @returns Formatted weekday and date string
 */
export function formatWeekdayDate(date: Date = new Date()): string {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * Get current date as ISO string (YYYY-MM-DD)
 * Useful for storing dates in ISO format
 * @returns ISO date string
 */
export function todayIso(): string {
  return new Date().toISOString().split("T")[0]!;
}
