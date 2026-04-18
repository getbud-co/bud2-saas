/**
 * Tests for ConversationsContext
 *
 * This context manages AI assistant conversations with CRUD operations,
 * pinning, archiving, messaging, and localStorage persistence.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { ConversationsProvider, useConversations } from "./ConversationsContext";

// ─── Test Helpers ───

function wrapper({ children }: { children: ReactNode }) {
  return <ConversationsProvider>{children}</ConversationsProvider>;
}

// ─── Tests ───

describe("ConversationsContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Context Setup
  // ═══════════════════════════════════════════════════════════════════════════

  describe("context setup", () => {
    it("throws when used outside provider", () => {
      expect(() => {
        renderHook(() => useConversations());
      }).toThrow("useConversations must be used within a ConversationsProvider");
    });

    it("provides context when used with provider", () => {
      const { result } = renderHook(() => useConversations(), { wrapper });
      expect(result.current).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Initial State
  // ═══════════════════════════════════════════════════════════════════════════

  describe("initial state", () => {
    it("has conversations array", () => {
      const { result } = renderHook(() => useConversations(), { wrapper });
      expect(Array.isArray(result.current.conversations)).toBe(true);
    });

    it("has archivedConversations array", () => {
      const { result } = renderHook(() => useConversations(), { wrapper });
      expect(Array.isArray(result.current.archivedConversations)).toBe(true);
    });

    it("has no active conversation initially", () => {
      const { result } = renderHook(() => useConversations(), { wrapper });
      expect(result.current.activeConversation).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Create Conversation
  // ═══════════════════════════════════════════════════════════════════════════

  describe("createConversation", () => {
    it("creates a conversation with default title", () => {
      const { result } = renderHook(() => useConversations(), { wrapper });

      const initialCount = result.current.conversations.length;

      act(() => {
        result.current.createConversation();
      });

      expect(result.current.conversations.length).toBe(initialCount + 1);
      const created = result.current.conversations.find((c) => c.title === "Nova conversa");
      expect(created).toBeDefined();
    });

    it("creates a conversation with custom title", () => {
      const { result } = renderHook(() => useConversations(), { wrapper });

      act(() => {
        result.current.createConversation("Minha conversa");
      });

      const created = result.current.conversations.find((c) => c.title === "Minha conversa");
      expect(created).toBeDefined();
      expect(created?.id).toBeDefined();
      expect(created?.createdAt).toBeDefined();
    });

    it("auto-sets new conversation as active", () => {
      const { result } = renderHook(() => useConversations(), { wrapper });

      let conv: ReturnType<typeof result.current.createConversation>;
      act(() => {
        conv = result.current.createConversation("Active Test");
      });

      expect(result.current.activeConversation).not.toBeNull();
      expect(result.current.activeConversation?.id).toBe(conv!.id);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Delete Conversation
  // ═══════════════════════════════════════════════════════════════════════════

  describe("deleteConversation", () => {
    it("removes a conversation", () => {
      const { result } = renderHook(() => useConversations(), { wrapper });

      let convId: string;
      act(() => {
        const conv = result.current.createConversation("To Delete");
        convId = conv.id;
      });

      const countBefore = result.current.conversations.length;

      act(() => {
        result.current.deleteConversation(convId!);
      });

      expect(result.current.conversations.length).toBe(countBefore - 1);
      expect(result.current.conversations.find((c) => c.id === convId)).toBeUndefined();
    });

    it("clears active conversation when deleted", () => {
      const { result } = renderHook(() => useConversations(), { wrapper });

      let convId: string;
      act(() => {
        const conv = result.current.createConversation("Active to Delete");
        convId = conv.id;
      });

      // Should be active after creation
      expect(result.current.activeConversation?.id).toBe(convId!);

      act(() => {
        result.current.deleteConversation(convId!);
      });

      expect(result.current.activeConversation).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Rename Conversation
  // ═══════════════════════════════════════════════════════════════════════════

  describe("renameConversation", () => {
    it("updates the title", () => {
      const { result } = renderHook(() => useConversations(), { wrapper });

      let convId: string;
      act(() => {
        const conv = result.current.createConversation("Original Title");
        convId = conv.id;
      });

      act(() => {
        result.current.renameConversation(convId!, "New Title");
      });

      const updated = result.current.conversations.find((c) => c.id === convId);
      expect(updated?.title).toBe("New Title");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Toggle Pin
  // ═══════════════════════════════════════════════════════════════════════════

  describe("togglePin", () => {
    it("pins a conversation", () => {
      const { result } = renderHook(() => useConversations(), { wrapper });

      let convId: string;
      act(() => {
        const conv = result.current.createConversation("Pin Me");
        convId = conv.id;
      });

      act(() => {
        result.current.togglePin(convId!);
      });

      const pinned = result.current.conversations.find((c) => c.id === convId);
      expect(pinned?.pinned).toBe(true);
    });

    it("unpins a pinned conversation", () => {
      const { result } = renderHook(() => useConversations(), { wrapper });

      let convId: string;
      act(() => {
        const conv = result.current.createConversation("Toggle Pin");
        convId = conv.id;
      });

      // Pin
      act(() => {
        result.current.togglePin(convId!);
      });

      // Unpin
      act(() => {
        result.current.togglePin(convId!);
      });

      const conv = result.current.conversations.find((c) => c.id === convId);
      expect(conv?.pinned).toBe(false);
    });

    it("pinned conversations appear first in the list", () => {
      const { result } = renderHook(() => useConversations(), { wrapper });

      let conv1Id: string;
      let conv2Id: string;
      act(() => {
        const c1 = result.current.createConversation("First");
        conv1Id = c1.id;
      });
      act(() => {
        const c2 = result.current.createConversation("Second");
        conv2Id = c2.id;
      });

      // Pin the first (older) conversation
      act(() => {
        result.current.togglePin(conv1Id!);
      });

      // Pinned should be first even if older
      const pinnedConv = result.current.conversations.find((c) => c.pinned);
      expect(pinnedConv?.id).toBe(conv1Id);
      expect(result.current.conversations[0]?.pinned).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Archive Conversation
  // ═══════════════════════════════════════════════════════════════════════════

  describe("archiveConversation", () => {
    it("moves conversation to archived list", () => {
      const { result } = renderHook(() => useConversations(), { wrapper });

      let convId: string;
      act(() => {
        const conv = result.current.createConversation("To Archive");
        convId = conv.id;
      });

      const activeBefore = result.current.conversations.length;

      act(() => {
        result.current.archiveConversation(convId!);
      });

      expect(result.current.conversations.length).toBe(activeBefore - 1);
      expect(result.current.conversations.find((c) => c.id === convId)).toBeUndefined();
      expect(result.current.archivedConversations.find((c) => c.id === convId)).toBeDefined();
    });

    it("clears active conversation when archived", () => {
      const { result } = renderHook(() => useConversations(), { wrapper });

      let convId: string;
      act(() => {
        const conv = result.current.createConversation("Active to Archive");
        convId = conv.id;
      });

      expect(result.current.activeConversation?.id).toBe(convId!);

      act(() => {
        result.current.archiveConversation(convId!);
      });

      expect(result.current.activeConversation).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Add Message
  // ═══════════════════════════════════════════════════════════════════════════

  describe("addMessage", () => {
    it("adds a user message to a conversation", () => {
      const { result } = renderHook(() => useConversations(), { wrapper });

      let convId: string;
      act(() => {
        const conv = result.current.createConversation("Chat");
        convId = conv.id;
      });

      act(() => {
        result.current.addMessage(convId!, "user", "Hello!");
      });

      const conv = result.current.conversations.find((c) => c.id === convId);
      expect(conv?.messages.length).toBeGreaterThan(0);
      const lastMsg = conv?.messages[conv.messages.length - 1];
      expect(lastMsg?.role).toBe("user");
      expect(lastMsg?.content).toBe("Hello!");
    });

    it("adds an assistant message", () => {
      const { result } = renderHook(() => useConversations(), { wrapper });

      let convId: string;
      act(() => {
        const conv = result.current.createConversation("Chat");
        convId = conv.id;
      });

      act(() => {
        result.current.addMessage(convId!, "assistant", "Hi there!");
      });

      const conv = result.current.conversations.find((c) => c.id === convId);
      const lastMsg = conv?.messages[conv.messages.length - 1];
      expect(lastMsg?.role).toBe("assistant");
      expect(lastMsg?.content).toBe("Hi there!");
    });

    it("returns the created message with id and timestamp", () => {
      const { result } = renderHook(() => useConversations(), { wrapper });

      let convId: string;
      act(() => {
        const conv = result.current.createConversation("Chat");
        convId = conv.id;
      });

      let msg: ReturnType<typeof result.current.addMessage>;
      act(() => {
        msg = result.current.addMessage(convId!, "user", "Test");
      });

      expect(msg!.id).toBeDefined();
      expect(msg!.createdAt).toBeDefined();
      expect(msg!.role).toBe("user");
      expect(msg!.content).toBe("Test");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Active Conversation
  // ═══════════════════════════════════════════════════════════════════════════

  describe("active conversation management", () => {
    it("can set active conversation by id", () => {
      const { result } = renderHook(() => useConversations(), { wrapper });

      let convId: string;
      act(() => {
        const conv = result.current.createConversation("Set Active");
        convId = conv.id;
      });

      // Create another to change active
      act(() => {
        result.current.createConversation("Another");
      });

      act(() => {
        result.current.setActiveConversationId(convId!);
      });

      expect(result.current.activeConversation?.id).toBe(convId);
    });

    it("can clear active conversation", () => {
      const { result } = renderHook(() => useConversations(), { wrapper });

      act(() => {
        result.current.createConversation("Will Clear");
      });

      expect(result.current.activeConversation).not.toBeNull();

      act(() => {
        result.current.setActiveConversationId(null);
      });

      expect(result.current.activeConversation).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Reset to Seed
  // ═══════════════════════════════════════════════════════════════════════════

  describe("resetToSeed", () => {
    it("resets conversations and clears active", () => {
      const { result } = renderHook(() => useConversations(), { wrapper });

      // Create custom conversations
      act(() => {
        result.current.createConversation("Custom 1");
        result.current.createConversation("Custom 2");
      });

      expect(result.current.activeConversation).not.toBeNull();

      act(() => {
        result.current.resetToSeed();
      });

      expect(result.current.activeConversation).toBeNull();
      // Custom conversations should be gone
      expect(result.current.conversations.find((c) => c.title === "Custom 1")).toBeUndefined();
      expect(result.current.conversations.find((c) => c.title === "Custom 2")).toBeUndefined();
    });
  });
});
