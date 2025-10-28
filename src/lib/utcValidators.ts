/**
 * Zod validators for UTC date/time inputs
 *
 * These validators ensure that date inputs are properly converted to UTC
 * and validated before being stored in the database.
 */

import { z } from "zod";

/**
 * Validates and converts a date string to ISO 8601 UTC format.
 * Accepts ISO 8601 strings, converts to UTC Date and back to ISO string.
 *
 * @example
 * utcDateString.parse("2025-01-15T14:30:00.000Z") // "2025-01-15T14:30:00.000Z"
 * utcDateString.parse("2025-01-15") // "2025-01-15T00:00:00.000Z"
 */
export const utcDateString = z
  .string()
  .min(1, "Date is required")
  .transform((val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date format");
    }
    return date.toISOString();
  });

/**
 * Optional UTC date string validator (nullable)
 *
 * @example
 * utcDateOptional.parse(null) // null
 * utcDateOptional.parse(undefined) // null
 * utcDateOptional.parse("2025-01-15T14:30:00.000Z") // "2025-01-15T14:30:00.000Z"
 */
export const utcDateOptional = z
  .string()
  .nullable()
  .optional()
  .transform((val) => {
    if (!val) return null;
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date format");
    }
    return date.toISOString();
  });

/**
 * Validates a date range ensuring start <= end
 *
 * @example
 * utcDateRange.parse({
 *   start: "2025-01-15T00:00:00.000Z",
 *   end: "2025-01-20T00:00:00.000Z"
 * })
 */
export const utcDateRange = z
  .object({
    start: utcDateString,
    end: utcDateString,
  })
  .refine(
    (data) => {
      const start = new Date(data.start);
      const end = new Date(data.end);
      return start <= end;
    },
    {
      message: "Start date must be before or equal to end date",
    }
  );

/**
 * Optional date range validator
 */
export const utcDateRangeOptional = z
  .object({
    start: utcDateOptional,
    end: utcDateOptional,
  })
  .nullable()
  .optional()
  .refine(
    (data) => {
      if (!data?.start || !data?.end) return true;
      const start = new Date(data.start);
      const end = new Date(data.end);
      return start <= end;
    },
    {
      message: "Start date must be before or equal to end date",
    }
  );
