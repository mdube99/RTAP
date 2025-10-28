/**
 * UTC Date Utilities
 *
 * This module provides utilities for working with dates in UTC.
 * All dates in RTAP are stored, processed, and displayed in UTC.
 *
 * Key Principles:
 * - Storage: All dates stored in UTC in the database
 * - Input: Users input in local time, converted to UTC before storage
 * - Display: All dates shown with explicit "UTC" indicator
 * - API: All endpoints return ISO 8601 strings with Z suffix
 */

/**
 * Parses a date input and returns a UTC Date object.
 * Accepts string, Date, or null inputs.
 *
 * @param input - Date string (ISO 8601), Date object, or null
 * @returns Date object or null if input is null/invalid
 *
 * @example
 * parseUTC("2025-01-15T14:30:00.000Z") // Valid UTC date
 * parseUTC(new Date()) // Converts Date to UTC
 * parseUTC(null) // Returns null
 */
export function parseUTC(input: string | Date | null | undefined): Date | null {
  if (!input) return null;

  const date = typeof input === "string" ? new Date(input) : input;

  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * Validates that a date is valid.
 * Throws if date is invalid.
 *
 * @param date - Date to validate
 * @returns The same date if valid
 * @throws Error if date is invalid
 */
export function ensureUTC(date: Date): Date {
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }
  return date;
}

/**
 * Formats a date as "15 Jan 2025 UTC"
 *
 * @param input - Date string, Date object, or null
 * @returns Formatted date string with UTC indicator, or empty string if null
 *
 * @example
 * formatUTCDate("2025-01-15T14:30:00.000Z") // "15 Jan 2025 UTC"
 */
export function formatUTCDate(input: string | Date | null | undefined): string {
  const date = parseUTC(input);
  if (!date) return "";

  const day = date.getUTCDate();
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = monthNames[date.getUTCMonth()];
  const year = date.getUTCFullYear();

  return `${day} ${month} ${year} UTC`;
}

/**
 * Formats a date and time as "15 Jan 2025, 14:30 UTC"
 *
 * @param input - Date string, Date object, or null
 * @returns Formatted datetime string with UTC indicator, or empty string if null
 *
 * @example
 * formatUTCDateTime("2025-01-15T14:30:00.000Z") // "15 Jan 2025, 14:30 UTC"
 */
export function formatUTCDateTime(input: string | Date | null | undefined): string {
  const date = parseUTC(input);
  if (!date) return "";

  const day = date.getUTCDate();
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = monthNames[date.getUTCMonth()];
  const year = date.getUTCFullYear();

  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");

  return `${day} ${month} ${year}, ${hours}:${minutes} UTC`;
}

/**
 * Formats time as "14:30 UTC"
 *
 * @param input - Date string, Date object, or null
 * @returns Formatted time string with UTC indicator, or empty string if null
 *
 * @example
 * formatUTCTime("2025-01-15T14:30:00.000Z") // "14:30 UTC"
 */
export function formatUTCTime(input: string | Date | null | undefined): string {
  const date = parseUTC(input);
  if (!date) return "";

  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");

  return `${hours}:${minutes} UTC`;
}

/**
 * Converts a date to ISO 8601 string with Z suffix
 *
 * @param input - Date string, Date object, or null
 * @returns ISO 8601 string with Z suffix, or empty string if null
 *
 * @example
 * toUTCISO("2025-01-15T14:30:00.000Z") // "2025-01-15T14:30:00.000Z"
 * toUTCISO(new Date("2025-01-15T14:30:00.000Z")) // "2025-01-15T14:30:00.000Z"
 */
export function toUTCISO(input: string | Date | null | undefined): string {
  const date = parseUTC(input);
  if (!date) return "";
  return date.toISOString();
}

/**
 * Converts a datetime-local input string (local browser time) to UTC Date.
 * This is used when user inputs a date/time in their local timezone
 * and we need to convert it to UTC for storage.
 *
 * @param localString - datetime-local input value (YYYY-MM-DDTHH:mm format)
 * @returns UTC Date object
 *
 * @example
 * User in PST (UTC-8) enters "2025-01-15T14:30"
 * localInputToUTC("2025-01-15T14:30") // Returns Date("2025-01-15T22:30:00.000Z")
 */
export function localInputToUTC(localString: string): Date {
  if (!localString) {
    throw new Error("Invalid datetime-local input");
  }

  const date = new Date(localString);

  if (isNaN(date.getTime())) {
    throw new Error("Invalid datetime-local input");
  }

  return date;
}

/**
 * Converts a UTC Date to datetime-local input string (local browser time).
 * This is used when displaying a UTC date in a datetime-local input,
 * which shows the date in the user's local timezone.
 *
 * @param utcDate - UTC Date object
 * @returns datetime-local string (YYYY-MM-DDTHH:mm format) in user's local timezone
 *
 * @example
 * UTC date "2025-01-15T22:30:00.000Z"
 * User in PST (UTC-8):
 * utcToLocalInput(new Date("2025-01-15T22:30:00.000Z")) // "2025-01-15T14:30"
 */
export function utcToLocalInput(utcDate: Date | null | undefined): string {
  if (!utcDate) return "";

  const date = parseUTC(utcDate);
  if (!date) return "";

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Converts a date input string (local browser date) to UTC Date at start of day.
 * This is used when user inputs a date (no time) in their local timezone
 * and we need to convert it to UTC for storage.
 *
 * @param localDateString - date input value (YYYY-MM-DD format)
 * @returns UTC Date object at start of day in local timezone
 *
 * @example
 * User in PST (UTC-8) enters "2025-01-15"
 * localDateInputToUTC("2025-01-15") // Returns Date("2025-01-15T08:00:00.000Z")
 */
export function localDateInputToUTC(localDateString: string): Date {
  if (!localDateString) {
    throw new Error("Invalid date input");
  }

  const date = new Date(localDateString + "T00:00:00");

  if (isNaN(date.getTime())) {
    throw new Error("Invalid date input");
  }

  return date;
}

/**
 * Converts a UTC Date to date input string (local browser date).
 * This is used when displaying a UTC date in a date input,
 * which shows the date in the user's local timezone.
 *
 * @param utcDate - UTC Date object
 * @returns date string (YYYY-MM-DD format) in user's local timezone
 *
 * @example
 * UTC date "2025-01-15T08:00:00.000Z"
 * User in PST (UTC-8):
 * utcToLocalDateInput(new Date("2025-01-15T08:00:00.000Z")) // "2025-01-15"
 */
export function utcToLocalDateInput(utcDate: Date | null | undefined): string {
  if (!utcDate) return "";

  const date = parseUTC(utcDate);
  if (!date) return "";

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Formats a date as "Jan 2025 UTC" (month and year only)
 *
 * @param input - Date string, Date object, or null
 * @returns Formatted month-year string with UTC indicator, or empty string if null
 *
 * @example
 * formatUTCMonthYear("2025-01-15T14:30:00.000Z") // "Jan 2025 UTC"
 */
export function formatUTCMonthYear(input: string | Date | null | undefined): string {
  const date = parseUTC(input);
  if (!date) return "";

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = monthNames[date.getUTCMonth()];
  const year = date.getUTCFullYear();

  return `${month} ${year} UTC`;
}
