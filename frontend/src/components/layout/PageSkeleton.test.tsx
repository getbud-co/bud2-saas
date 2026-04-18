/**
 * Tests for PageSkeleton
 *
 * Loading placeholder for page content with cards grid.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageSkeleton } from "./PageSkeleton";

describe("PageSkeleton", () => {
  it("renders with status role", () => {
    render(<PageSkeleton />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has accessible loading label", () => {
    render(<PageSkeleton />);
    expect(screen.getByLabelText("Carregando")).toBeInTheDocument();
  });
});
