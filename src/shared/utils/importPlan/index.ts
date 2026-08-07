import type { ImportPlan } from '../../types';

/**
 * A plan that would create nothing.
 *
 * Built fresh on every call rather than shared as a constant: an empty plan is handed to React
 * state and to failed parse results, and one shared value would be an array three components
 * could append to by accident. The cost of a new object is nothing; the cost of a leaked
 * mutation is a work appearing in an import nobody asked for.
 */
export const createEmptyImportPlan = (): ImportPlan => ({ works: [], chapters: [], series: [] });
