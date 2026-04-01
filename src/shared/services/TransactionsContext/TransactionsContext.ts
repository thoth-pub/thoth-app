type RollbackFn = () => Promise<void>;

export class TransactionContext {
  private rollbackStack: RollbackFn[] = [];

  onRollback(fn: RollbackFn): void {
    this.rollbackStack.push(fn);
  }

  async rollback(): Promise<void> {
    for (const fn of [...this.rollbackStack].reverse()) {
      await fn().catch(console.error);
    }
  }
}
