import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// Global mock for use-cycles hook (ConfigDataProvider depends on it internally).
// Individual test files may override this with their own vi.mock factory.
vi.mock("@/hooks/use-cycles", () => ({
  useCycles: vi.fn(() => ({ data: [], isLoading: false, error: null })),
  useCreateCycle: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useUpdateCycle: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteCycle: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
});

// Reset localStorage before each test.
// Note: vi.clearAllMocks() resets call counts but the vi.mock factory
// functions are re-invoked per test file, so the implementations are stable.
beforeEach(() => {
  localStorage.clear();
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver as a proper class
class ResizeObserverMock {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// Mock IntersectionObserver
globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
