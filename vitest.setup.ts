import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock the servicesContext to prevent service instantiation during module load
vi.mock('@/src/shared/context/servicesContext', () => ({
  useServices: vi.fn(),
  ServicesProvider: vi.fn(({ children }) => children),
}));
