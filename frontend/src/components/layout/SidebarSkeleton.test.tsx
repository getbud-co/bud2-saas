/**
 * Tests for SidebarSkeleton
 *
 * Loading placeholder for sidebar with nav groups and user footer.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SidebarSkeleton } from "./SidebarSkeleton";

describe("SidebarSkeleton", () => {
  it("renders with status role", () => {
    render(<SidebarSkeleton />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has accessible loading label", () => {
    render(<SidebarSkeleton />);
    expect(screen.getByLabelText("Carregando")).toBeInTheDocument();
  });
});
