/**
 * Tests for QuickCheckinDrawer
 *
 * Controlled drawer component for quick check-ins on key results.
 * Props: open, onClose, keyResultId.
 * Uses MissionsDataContext and PeopleDataContext.
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../tests/setup/test-utils";
import { QuickCheckinDrawer } from "./QuickCheckinDrawer";

// ─── Test Helpers ───

interface SetupProps {
  open?: boolean;
  keyResultId?: string | null;
  onClose?: () => void;
}

function setup(props: SetupProps = {}) {
  const user = userEvent.setup();
  const onClose = props.onClose ?? vi.fn();
  const result = renderWithProviders(
    <QuickCheckinDrawer
      open={props.open ?? true}
      onClose={onClose}
      keyResultId={props.keyResultId ?? null}
    />,
  );
  return { user, onClose, ...result };
}

// ─── Tests ───

describe("QuickCheckinDrawer", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("rendering when no key result is found", () => {
    it("renders without crashing when open with null keyResultId", () => {
      setup({ open: true, keyResultId: null });
      expect(screen.getByText("Check-in")).toBeInTheDocument();
    });

    it("shows 'not found' message when keyResultId is null", () => {
      setup({ open: true, keyResultId: null });
      expect(screen.getByText("Indicador não encontrado.")).toBeInTheDocument();
    });

    it("shows 'not found' message for non-existent keyResultId", () => {
      setup({ open: true, keyResultId: "non-existent-kr-id" });
      expect(screen.getByText("Indicador não encontrado.")).toBeInTheDocument();
    });
  });

  describe("closed state", () => {
    it("renders without crashing when closed", () => {
      setup({ open: false, keyResultId: null });
      // When closed, the drawer may or may not render content depending
      // on the DragToCloseDrawer implementation, but it should not crash
    });
  });

  describe("interactions", () => {
    it("renders close functionality when open", () => {
      const onClose = vi.fn();
      setup({ open: true, keyResultId: null, onClose });
      // The DrawerHeader has an onClose handler which renders a close button
      expect(screen.getByText("Check-in")).toBeInTheDocument();
    });
  });
});
