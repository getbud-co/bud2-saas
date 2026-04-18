/**
 * Tests for SurveysPageSkeleton
 *
 * Loading skeleton shown while the surveys page is loading.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderMinimal } from "../../../../tests/setup/test-utils";
import { SurveysPageSkeleton } from "./SurveysSkeleton";

describe("SurveysPageSkeleton", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders with status role", () => {
    renderMinimal(<SurveysPageSkeleton />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has accessible loading label", () => {
    renderMinimal(<SurveysPageSkeleton />);
    expect(screen.getByLabelText("Carregando")).toBeInTheDocument();
  });

  it("renders skeleton elements", () => {
    const { container } = renderMinimal(<SurveysPageSkeleton />);
    // Should contain multiple skeleton placeholders
    const skeletons = container.querySelectorAll("[class*='skeleton'], [class*='Skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders table rows placeholders", () => {
    const { container } = renderMinimal(<SurveysPageSkeleton />);
    // 6 table rows per the component
    const tableRows = container.querySelectorAll("[class*='tableRow']");
    expect(tableRows.length).toBe(6);
  });

  it("renders metric cards placeholders", () => {
    const { container } = renderMinimal(<SurveysPageSkeleton />);
    const metricCards = container.querySelectorAll("[class*='metricCard']");
    expect(metricCards.length).toBe(4);
  });
});
