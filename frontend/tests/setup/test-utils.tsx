import { ReactElement, ReactNode } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ActivityDataProvider } from "@/contexts/ActivityDataContext";
import { ConfigDataProvider } from "@/contexts/ConfigDataContext";
import { PeopleDataProvider } from "@/contexts/PeopleDataContext";
import { MissionsDataProvider } from "@/contexts/MissionsDataContext";
import { SurveysDataProvider } from "@/contexts/SurveysDataContext";
import { SettingsDataProvider } from "@/contexts/SettingsDataContext";
import { IntegrationsDataProvider } from "@/contexts/IntegrationsDataContext";
import { MockAuthProvider } from "./MockAuthProvider";

/**
 * All application providers wrapped together for testing.
 * Use this when testing components that depend on context data.
 *
 * @param initialEntries - Optional initial entries for MemoryRouter (defaults to ["/"])
 */
export function AllProviders({
  children,
  initialEntries,
}: {
  children: ReactNode;
  initialEntries?: string[];
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <MockAuthProvider>
        <QueryClientProvider client={queryClient}>
        <ConfigDataProvider>
          <ActivityDataProvider>
            <PeopleDataProvider>
              <MissionsDataProvider>
                <SurveysDataProvider>
                  <SettingsDataProvider>
                    <IntegrationsDataProvider>
                      {children}
                    </IntegrationsDataProvider>
                  </SettingsDataProvider>
                </SurveysDataProvider>
              </MissionsDataProvider>
            </PeopleDataProvider>
          </ActivityDataProvider>
        </ConfigDataProvider>
        </QueryClientProvider>
      </MockAuthProvider>
    </MemoryRouter>
  );
}

/**
 * Minimal providers for testing components that only need routing.
 * Use this for simpler components that don't need full context.
 *
 * @param initialEntries - Optional initial entries for MemoryRouter (defaults to ["/"])
 */
export function MinimalProviders({
  children,
  initialEntries,
}: {
  children: ReactNode;
  initialEntries?: string[];
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <MockAuthProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </MockAuthProvider>
    </MemoryRouter>
  );
}

/**
 * Custom render function that wraps components with all providers.
 * Use this as a drop-in replacement for @testing-library/react render.
 *
 * @example
 * ```tsx
 * import { renderWithProviders, screen } from '@/tests/setup/test-utils';
 *
 * test('renders component', () => {
 *   renderWithProviders(<MyComponent />);
 *   expect(screen.getByText('Hello')).toBeInTheDocument();
 * });
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & { initialEntries?: string[] }
) {
  const { initialEntries, ...renderOptions } = options ?? {};
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AllProviders initialEntries={initialEntries}>{children}</AllProviders>
  );
  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Render with minimal providers (just routing + auth mock).
 */
export function renderMinimal(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & { initialEntries?: string[] }
) {
  const { initialEntries, ...renderOptions } = options ?? {};
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MinimalProviders initialEntries={initialEntries}>{children}</MinimalProviders>
  );
  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";

// Override render with our custom version
export { renderWithProviders as render };
