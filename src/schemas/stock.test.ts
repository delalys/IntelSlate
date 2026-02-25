/**
 * Stock Validation Schema Tests
 *
 * Tests for AddStockSchema and UpdateStockSchema
 * Validates ticker, buyPrice, and quantity fields
 */

import { describe, expect, it } from 'vitest';
import { AddStockSchema, UpdateStockSchema } from './stock';

describe('AddStockSchema', () => {
  describe('valid inputs', () => {
    it('should accept valid stock data', () => {
      const validData = {
        ticker: 'AAPL',
        buyPrice: 150.5,
        quantity: 10,
      };

      const result = AddStockSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ticker).toBe('AAPL');
        expect(result.data.buyPrice).toBe(150.5);
        expect(result.data.quantity).toBe(10);
      }
    });

    it('should accept 1-character ticker', () => {
      const result = AddStockSchema.safeParse({
        ticker: 'A',
        buyPrice: 100,
        quantity: 1,
      });
      expect(result.success).toBe(true);
    });

    it('should accept 5-character ticker', () => {
      const result = AddStockSchema.safeParse({
        ticker: 'GOOGL',
        buyPrice: 100,
        quantity: 1,
      });
      expect(result.success).toBe(true);
    });

    it('should convert ticker to uppercase', () => {
      const result = AddStockSchema.safeParse({
        ticker: 'aapl',
        buyPrice: 100,
        quantity: 1,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ticker).toBe('AAPL');
      }
    });
  });

  describe('ticker validation', () => {
    it('should reject empty ticker', () => {
      const result = AddStockSchema.safeParse({
        ticker: '',
        buyPrice: 100,
        quantity: 1,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'at least 1 character',
        );
      }
    });

    it('should reject ticker longer than 20 characters', () => {
      const result = AddStockSchema.safeParse({
        ticker: 'ABCDEFGHIJKLMNOPQRSTU',
        buyPrice: 100,
        quantity: 1,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'at most 20 characters',
        );
      }
    });

    it('should accept ticker with dots and numbers for international tickers', () => {
      const result = AddStockSchema.safeParse({
        ticker: 'ASML.AS',
        buyPrice: 100,
        quantity: 1,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('buyPrice validation', () => {
    it('should reject zero price', () => {
      const result = AddStockSchema.safeParse({
        ticker: 'AAPL',
        buyPrice: 0,
        quantity: 1,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('positive');
      }
    });

    it('should reject negative price', () => {
      const result = AddStockSchema.safeParse({
        ticker: 'AAPL',
        buyPrice: -10,
        quantity: 1,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('positive');
      }
    });

    it('should accept decimal prices', () => {
      const result = AddStockSchema.safeParse({
        ticker: 'AAPL',
        buyPrice: 150.99,
        quantity: 1,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('quantity validation', () => {
    it('should reject zero quantity', () => {
      const result = AddStockSchema.safeParse({
        ticker: 'AAPL',
        buyPrice: 100,
        quantity: 0,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('positive');
      }
    });

    it('should reject negative quantity', () => {
      const result = AddStockSchema.safeParse({
        ticker: 'AAPL',
        buyPrice: 100,
        quantity: -5,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('positive');
      }
    });

    it('should reject decimal quantity', () => {
      const result = AddStockSchema.safeParse({
        ticker: 'AAPL',
        buyPrice: 100,
        quantity: 1.5,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('whole number');
      }
    });

    it('should accept integer quantity', () => {
      const result = AddStockSchema.safeParse({
        ticker: 'AAPL',
        buyPrice: 100,
        quantity: 100,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('missing fields', () => {
    it('should reject missing ticker', () => {
      const result = AddStockSchema.safeParse({
        buyPrice: 100,
        quantity: 1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing buyPrice', () => {
      const result = AddStockSchema.safeParse({
        ticker: 'AAPL',
        quantity: 1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing quantity', () => {
      const result = AddStockSchema.safeParse({
        ticker: 'AAPL',
        buyPrice: 100,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('UpdateStockSchema', () => {
  describe('valid inputs', () => {
    it('should accept updating buyPrice only', () => {
      const result = UpdateStockSchema.safeParse({
        buyPrice: 175.5,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.buyPrice).toBe(175.5);
        expect(result.data.quantity).toBeUndefined();
      }
    });

    it('should accept updating quantity only', () => {
      const result = UpdateStockSchema.safeParse({
        quantity: 20,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantity).toBe(20);
        expect(result.data.buyPrice).toBeUndefined();
      }
    });

    it('should accept updating both fields', () => {
      const result = UpdateStockSchema.safeParse({
        buyPrice: 200,
        quantity: 50,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.buyPrice).toBe(200);
        expect(result.data.quantity).toBe(50);
      }
    });

    it('should accept empty object (no updates)', () => {
      const result = UpdateStockSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('buyPrice validation', () => {
    it('should reject zero price', () => {
      const result = UpdateStockSchema.safeParse({
        buyPrice: 0,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('positive');
      }
    });

    it('should reject negative price', () => {
      const result = UpdateStockSchema.safeParse({
        buyPrice: -50,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('positive');
      }
    });
  });

  describe('quantity validation', () => {
    it('should reject zero quantity', () => {
      const result = UpdateStockSchema.safeParse({
        quantity: 0,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('positive');
      }
    });

    it('should reject negative quantity', () => {
      const result = UpdateStockSchema.safeParse({
        quantity: -10,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('positive');
      }
    });

    it('should reject decimal quantity', () => {
      const result = UpdateStockSchema.safeParse({
        quantity: 5.5,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('whole number');
      }
    });
  });
});
