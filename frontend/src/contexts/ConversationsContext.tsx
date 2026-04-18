/**
 * ConversationsContext — React context for AI assistant conversations
 *
 * Follows the same patterns as SettingsDataContext.
 * Wraps conversations-store and provides CRUD operations for conversations and messages.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  generateId,
  loadConversationsSnapshot,
  resetConversationsSnapshot,
  saveConversationsSnapshot,
  type Conversation,
  type ConversationMessage,
  type ConversationsStoreSnapshot,
} from "@/lib/conversations-store";

// ─── Constants ───

const DEFAULT_USER_ID = "user-1";
const DEFAULT_ORG_ID = "org-1";

// ─── Context Types ───

interface ConversationsContextValue {
  conversations: Conversation[]; // all non-archived, sorted by updatedAt desc
  archivedConversations: Conversation[];
  activeConversation: Conversation | null;
  setActiveConversationId: (id: string | null) => void;

  createConversation: (title?: string) => Conversation;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  togglePin: (id: string) => void;
  archiveConversation: (id: string) => void;

  addMessage: (conversationId: string, role: "user" | "assistant", content: string) => ConversationMessage;

  resetToSeed: () => void;
}

const ConversationsContext = createContext<ConversationsContextValue | null>(null);

// ─── Sorting Helper ───

function sortConversations(convs: Conversation[]): Conversation[] {
  return [...convs].sort((a, b) => {
    // Pinned first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    // Then by updatedAt desc
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

// ─── Provider ───

interface ConversationsProviderProps {
  children: ReactNode;
}

export function ConversationsProvider({ children }: ConversationsProviderProps) {
  const [snapshot, setSnapshot] = useState<ConversationsStoreSnapshot>(() => loadConversationsSnapshot());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // ─── Derived State ───

  const userConversations = useMemo(() => {
    return snapshot.conversationsByUser[DEFAULT_USER_ID] ?? [];
  }, [snapshot.conversationsByUser]);

  const conversations = useMemo(() => {
    return sortConversations(userConversations.filter((c) => !c.archived));
  }, [userConversations]);

  const archivedConversations = useMemo(() => {
    return sortConversations(userConversations.filter((c) => c.archived));
  }, [userConversations]);

  const activeConversation = useMemo(() => {
    if (!activeConversationId) return null;
    return userConversations.find((c) => c.id === activeConversationId) ?? null;
  }, [activeConversationId, userConversations]);

  // ─── Save Helper ───

  const persistSnapshot = useCallback((next: Omit<ConversationsStoreSnapshot, "schemaVersion" | "updatedAt">) => {
    const saved = saveConversationsSnapshot(next);
    setSnapshot(saved);
  }, []);

  // ─── CRUD Operations ───

  const createConversation = useCallback((title?: string): Conversation => {
    const now = new Date().toISOString();
    const newConversation: Conversation = {
      id: generateId("conv"),
      orgId: DEFAULT_ORG_ID,
      userId: DEFAULT_USER_ID,
      title: title ?? "Nova conversa",
      messages: [],
      pinned: false,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    const current = snapshot.conversationsByUser[DEFAULT_USER_ID] ?? [];
    persistSnapshot({
      ...snapshot,
      conversationsByUser: {
        ...snapshot.conversationsByUser,
        [DEFAULT_USER_ID]: [...current, newConversation],
      },
    });

    // Auto-set as active
    setActiveConversationId(newConversation.id);

    return newConversation;
  }, [snapshot, persistSnapshot]);

  const deleteConversation = useCallback((id: string) => {
    const current = snapshot.conversationsByUser[DEFAULT_USER_ID] ?? [];
    persistSnapshot({
      ...snapshot,
      conversationsByUser: {
        ...snapshot.conversationsByUser,
        [DEFAULT_USER_ID]: current.filter((c) => c.id !== id),
      },
    });

    // Clear active if deleted
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  }, [snapshot, persistSnapshot, activeConversationId]);

  const renameConversation = useCallback((id: string, title: string) => {
    const current = snapshot.conversationsByUser[DEFAULT_USER_ID] ?? [];
    persistSnapshot({
      ...snapshot,
      conversationsByUser: {
        ...snapshot.conversationsByUser,
        [DEFAULT_USER_ID]: current.map((c) =>
          c.id === id ? { ...c, title, updatedAt: new Date().toISOString() } : c
        ),
      },
    });
  }, [snapshot, persistSnapshot]);

  const togglePin = useCallback((id: string) => {
    const current = snapshot.conversationsByUser[DEFAULT_USER_ID] ?? [];
    persistSnapshot({
      ...snapshot,
      conversationsByUser: {
        ...snapshot.conversationsByUser,
        [DEFAULT_USER_ID]: current.map((c) =>
          c.id === id ? { ...c, pinned: !c.pinned, updatedAt: new Date().toISOString() } : c
        ),
      },
    });
  }, [snapshot, persistSnapshot]);

  const archiveConversation = useCallback((id: string) => {
    const current = snapshot.conversationsByUser[DEFAULT_USER_ID] ?? [];
    persistSnapshot({
      ...snapshot,
      conversationsByUser: {
        ...snapshot.conversationsByUser,
        [DEFAULT_USER_ID]: current.map((c) =>
          c.id === id ? { ...c, archived: true, updatedAt: new Date().toISOString() } : c
        ),
      },
    });

    // Clear active if archived
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  }, [snapshot, persistSnapshot, activeConversationId]);

  const addMessage = useCallback((conversationId: string, role: "user" | "assistant", content: string): ConversationMessage => {
    const now = new Date().toISOString();
    const newMessage: ConversationMessage = {
      id: generateId("msg"),
      role,
      content,
      createdAt: now,
    };

    const current = snapshot.conversationsByUser[DEFAULT_USER_ID] ?? [];
    persistSnapshot({
      ...snapshot,
      conversationsByUser: {
        ...snapshot.conversationsByUser,
        [DEFAULT_USER_ID]: current.map((c) =>
          c.id === conversationId
            ? { ...c, messages: [...c.messages, newMessage], updatedAt: now }
            : c
        ),
      },
    });

    return newMessage;
  }, [snapshot, persistSnapshot]);

  // ─── Reset ───

  const resetToSeed = useCallback(() => {
    const seed = resetConversationsSnapshot();
    setSnapshot(seed);
    setActiveConversationId(null);
  }, []);

  // ─── Context Value ───

  const value: ConversationsContextValue = useMemo(() => ({
    conversations,
    archivedConversations,
    activeConversation,
    setActiveConversationId,
    createConversation,
    deleteConversation,
    renameConversation,
    togglePin,
    archiveConversation,
    addMessage,
    resetToSeed,
  }), [
    conversations,
    archivedConversations,
    activeConversation,
    createConversation,
    deleteConversation,
    renameConversation,
    togglePin,
    archiveConversation,
    addMessage,
    resetToSeed,
  ]);

  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  );
}

// ─── Hook ───

export function useConversations(): ConversationsContextValue {
  const context = useContext(ConversationsContext);
  if (!context) {
    throw new Error("useConversations must be used within a ConversationsProvider");
  }
  return context;
}
