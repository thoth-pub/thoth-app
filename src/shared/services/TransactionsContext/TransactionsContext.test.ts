import { describe, expect, it, vi } from 'vitest';

import { TransactionContext } from './TransactionsContext';

describe('TransactionContext', () => {
  it('runs every step last registered first and returns no failures when all succeed', async () => {
    const order: string[] = [];
    const transactions = new TransactionContext();

    transactions.onRollback(async () => void order.push('first'));
    transactions.onRollback(async () => void order.push('second'));

    expect(await transactions.rollback()).toEqual([]);
    expect(order).toEqual(['second', 'first']);
  });

  it('keeps going after a failing step and returns its error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('delete failed');
    const ran = vi.fn(async () => {});
    const transactions = new TransactionContext();

    transactions.onRollback(ran);
    transactions.onRollback(async () => {
      throw failure;
    });

    expect(await transactions.rollback()).toEqual([failure]);
    expect(ran).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });
});
