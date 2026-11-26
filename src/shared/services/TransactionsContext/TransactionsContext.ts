type RollbackFn = () => Promise<void>;

export class TransactionContext {
  private rollbackStack: RollbackFn[] = [];

  onRollback(fn: RollbackFn): void {
    this.rollbackStack.push(fn);
  }

  /** Runs every step, last registered first. A failing step is logged and never stops the rest; its error is returned. */
  async rollback(): Promise<unknown[]> {
    const failures: unknown[] = [];

    for (const fn of [...this.rollbackStack].reverse()) {
      await fn().catch((error: unknown) => {
        console.error(error);
        failures.push(error);
      });
    }

    return failures;
  }
}
