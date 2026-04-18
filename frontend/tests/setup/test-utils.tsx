import { ReactElement, ReactNode } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { ActivityDataProvider } from "@/contexts/ActivityDataContext";
import { ConfigDataProvider } from "@/contexts/ConfigDataContext";
import { PeopleDataProvider } from "@/contexts/PeopleDataContext";
import { MissionsDataProvider } from "@/contexts/MissionsDataContext";
import { SurveysDataProvider } from "@/contexts/SurveysDataContext";
import { SettingsDataProvider } from "@/contexts/SettingsDataContext";
import { IntegrationsDataProvider } from "@/contexts/IntegrationsDataContext";

/**
 * All application providers wrapped together for testing.
 * Use this when testing components that depend on context data.
 */
export function AllProviders({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
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
    </MemoryRouter>
  );
}

/**
 * Minimal providers for testing components that only need routing.
 * Use this for simpler components that don't need full context.
 */
export function MinimalProviders({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
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
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

/**
 * Render with minimal providers (just routing).
 */
export function renderMinimal(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, { wrapper: MinimalProviders, ...options });
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";

// Override render with our custom version
export { renderWithProviders as render };
