/**
 * Tests for ErrorScreen
 *
 * Renders an error alert with retry button and optional error code.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorScreen } from "./ErrorScreen";

describe("ErrorScreen", () => {
  it("renders with alert role", () => {
    render(<ErrorScreen />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders error title", () => {
    render(<ErrorScreen />);
    expect(screen.getByText("Não foi possível conectar ao servidor")).toBeInTheDocument();
  });

  it("renders retry button", () => {
    render(<ErrorScreen />);
    expect(screen.getByRole("button", { name: /tentar novamente/i })).toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(<ErrorScreen onRetry={onRetry} />);

    await user.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("displays error code when provided", () => {
    render(<ErrorScreen errorCode="ERR_500" />);
    expect(screen.getByText("ERR_500")).toBeInTheDocument();
  });

  it("does not display error code when not provided", () => {
    render(<ErrorScreen />);
    expect(screen.queryByText(/ERR_/)).not.toBeInTheDocument();
  });
});
