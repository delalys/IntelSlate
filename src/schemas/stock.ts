/**
 * Stock Validation Schemas
 *
 * Zod schemas for validating stock operations.
 * Used in Server Actions for input validation before database operations.
 */

import { z } from 'zod';

/**
 * Schema for adding a new stock to the portfolio
 *
 * Validates:
 * - ticker: 1-20 character stock symbol (supports international tickers like ASML.AS, 7203.T)
 * - buyPrice: positive number (purchase price per share)
 * - quantity: positive integer (number of shares)
 */
export const AddStockSchema = z.object({
  ticker: z
    .string()
    .min(1, { message: 'Ticker must have at least 1 character' })
    .max(20, { message: 'Ticker must have at most 20 characters' })
    .transform((val) => val.toUpperCase()),
  buyPrice: z
    .number({ error: 'Buy price is required' })
    .positive({ message: 'Buy price must be a positive number' }),
  quantity: z
    .number({ error: 'Quantity is required' })
    .int({ message: 'Quantity must be a whole number' })
    .positive({ message: 'Quantity must be a positive number' }),
});

/**
 * Schema for updating an existing stock
 *
 * All fields are optional for partial updates.
 * Validates (when provided):
 * - buyPrice: positive number
 * - quantity: positive integer
 */
export const UpdateStockSchema = z.object({
  buyPrice: z
    .number()
    .positive({ message: 'Buy price must be a positive number' })
    .optional(),
  quantity: z
    .number()
    .int({ message: 'Quantity must be a whole number' })
    .positive({ message: 'Quantity must be a positive number' })
    .optional(),
});

/**
 * Type inference helpers for use in TypeScript
 */
export type TAddStockInput = z.infer<typeof AddStockSchema>;
export type TUpdateStockInput = z.infer<typeof UpdateStockSchema>;
