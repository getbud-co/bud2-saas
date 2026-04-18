/**
 * Tests for BudLogo
 *
 * Renders SVG logo with configurable height, color, and optional click handler.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BudLogo, BudLogoMark } from "./BudLogo";

describe("BudLogo", () => {
  it("renders SVG with aria-label", () => {
    render(<BudLogo />);
    expect(screen.getByLabelText("bud")).toBeInTheDocument();
  });

  it("applies custom height", () => {
    render(<BudLogo height={48} />);
    const svg = screen.getByLabelText("bud");
    expect(svg).toHaveAttribute("height", "48");
  });

  it("has button role when onClick is provided", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(<BudLogo onClick={onClick} />);
    const svg = screen.getByRole("button", { name: "bud" });
    expect(svg).toBeInTheDocument();

    await user.click(svg);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not have button role without onClick", () => {
    render(<BudLogo />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("BudLogoMark", () => {
  it("renders SVG with aria-label", () => {
    render(<BudLogoMark />);
    expect(screen.getByLabelText("bud")).toBeInTheDocument();
  });
});
