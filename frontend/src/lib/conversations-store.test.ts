/**
 * Tests for conversations-store.ts
 *
 * Conversations Store manages AI assistant conversations with local-first persistence.
 * Follows the same architectural patterns as settings-store.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  loadConversationsSnapshot,
  saveConversationsSnapshot,
  resetConversationsSnapshot,
  generateId,
  type ConversationsStoreSnapshot,
  type Conversation,
} from "./conversations-store";

const STORAGE_KEY = "bud.saas.conversations-store";

// ─── Test Helpers ───

function getStoredSnapshot(): ConversationsStoreSnapshot | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as ConversationsStoreSnapshot;
}

function setStoredSnapshot(snapshot: Partial<ConversationsStoreSnapshot>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

// ─── Tests ───

describe("conversations-store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Utility Functions
  // ═══════════════════════════════════════════════════════════════════════════

  describe("generateId", () => {
    it("gera IDs únicos com prefixo", () => {
      const id1 = generateId("conv");
      const id2 = generateId("conv");

      expect(id1).toMatch(/^conv-\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^conv-\d+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it("aceita diferentes prefixos", () => {
      const id1 = generateId("conv");
      const id2 = generateId("msg");

      expect(id1).toMatch(/^conv-/);
      expect(id2).toMatch(/^msg-/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // loadConversationsSnapshot
  // ═══════════════════════════════════════════════════════════════════════════

  describe("loadConversationsSnapshot", () => {
    describe("carga inicial (sem dados no localStorage)", () => {
      it("retorna snapshot seed quando localStorage está vazio", () => {
        const snapshot = loadConversationsSnapshot();
        expect(snapshot).toBeDefined();
        expect(snapshot.schemaVersion).toBe(1);
      });

      it("cria conversas seed para user-1", () => {
        const snapshot = loadConversationsSnapshot();
        expect(snapshot.conversationsByUser["user-1"]).toBeDefined();
        expect(snapshot.conversationsByUser["user-1"]!.length).toBe(3);
      });

      it("persiste seed no localStorage", () => {
        loadConversationsSnapshot();
        const stored = getStoredSnapshot();
        expect(stored).not.toBeNull();
        expect(stored!.schemaVersion).toBe(1);
      });

      it("seed possui 3 conversas para user-1", () => {
        const snapshot = loadConversationsSnapshot();
        const conversations = snapshot.conversationsByUser["user-1"]!;
        expect(conversations).toHaveLength(3);
      });

      it("conversas seed possuem títulos definidos", () => {
        const snapshot = loadConversationsSnapshot();
        const conversations = snapshot.conversationsByUser["user-1"]!;
        const titles = conversations.map((c) => c.title);
        expect(titles).toContain("Preparação 1:1 com Ana");
        expect(titles).toContain("Sugestões de OKR Q2");
        expect(titles).toContain("Análise de engajamento do time");
      });

      it("conversas seed possuem mensagens", () => {
        const snapshot = loadConversationsSnapshot();
        const conversations = snapshot.conversationsByUser["user-1"]!;
        for (const conv of conversations) {
          expect(conv.messages.length).toBeGreaterThan(0);
        }
      });

      it("primeira conversa seed está fixada", () => {
        const snapshot = loadConversationsSnapshot();
        const conversations = snapshot.conversationsByUser["user-1"]!;
        const pinned = conversations.find((c) => c.id === "conv-1");
        expect(pinned?.pinned).toBe(true);
      });

      it("nenhuma conversa seed está arquivada", () => {
        const snapshot = loadConversationsSnapshot();
        const conversations = snapshot.conversationsByUser["user-1"]!;
        for (const conv of conversations) {
          expect(conv.archived).toBe(false);
        }
      });
    });

    describe("carga com dados existentes", () => {
      it("carrega snapshot previamente salvo", () => {
        const customConversation: Conversation = {
          id: "conv-custom",
          orgId: "org-1",
          userId: "user-1",
          title: "Conversa personalizada",
          messages: [],
          pinned: false,
          archived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setStoredSnapshot({
          schemaVersion: 1,
          updatedAt: new Date().toISOString(),
          conversationsByUser: { "user-1": [customConversation] },
        });

        const snapshot = loadConversationsSnapshot();
        expect(snapshot.conversationsByUser["user-1"]).toHaveLength(1);
        expect(snapshot.conversationsByUser["user-1"]![0]!.title).toBe(
          "Conversa personalizada",
        );
      });

      it("preserva mensagens salvas", () => {
        setStoredSnapshot({
          schemaVersion: 1,
          updatedAt: new Date().toISOString(),
          conversationsByUser: {
            "user-1": [
              {
                id: "conv-1",
                orgId: "org-1",
                userId: "user-1",
                title: "Test",
                messages: [
                  {
                    id: "msg-1",
                    role: "user",
                    content: "Hello",
                    createdAt: new Date().toISOString(),
                  },
                  {
                    id: "msg-2",
                    role: "assistant",
                    content: "Hi there!",
                    createdAt: new Date().toISOString(),
                  },
                ],
                pinned: false,
                archived: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          },
        });

        const snapshot = loadConversationsSnapshot();
        const conv = snapshot.conversationsByUser["user-1"]![0]!;
        expect(conv.messages).toHaveLength(2);
        expect(conv.messages[0]!.role).toBe("user");
        expect(conv.messages[1]!.role).toBe("assistant");
      });
    });

    describe("migração de dados inválidos/corrompidos", () => {
      it("retorna seed para JSON inválido", () => {
        localStorage.setItem(STORAGE_KEY, "not valid json");
        const snapshot = loadConversationsSnapshot();
        expect(snapshot.schemaVersion).toBe(1);
        expect(snapshot.conversationsByUser["user-1"]).toBeDefined();
      });

      it("retorna seed para valor null armazenado", () => {
        setStoredSnapshot(null as any);
        const snapshot = loadConversationsSnapshot();
        expect(snapshot.schemaVersion).toBe(1);
      });

      it("garante que user-1 existe após migração de dados vazios", () => {
        setStoredSnapshot({
          schemaVersion: 1,
          updatedAt: new Date().toISOString(),
          conversationsByUser: {},
        });

        const snapshot = loadConversationsSnapshot();
        expect(snapshot.conversationsByUser["user-1"]).toBeDefined();
      });

      it("lida com campos ausentes em conversas graciosamente", () => {
        setStoredSnapshot({
          schemaVersion: 1,
          updatedAt: new Date().toISOString(),
          conversationsByUser: {
            "user-1": [
              {
                id: "conv-1",
                title: "Conversa parcial",
                // campos ausentes: orgId, userId, messages, pinned, archived, etc.
              } as any,
            ],
          },
        });

        const snapshot = loadConversationsSnapshot();
        const conv = snapshot.conversationsByUser["user-1"]![0]!;
        expect(conv.id).toBe("conv-1");
        expect(conv.title).toBe("Conversa parcial");
        expect(conv.orgId).toBe("org-1"); // default
        expect(conv.userId).toBe("user-1"); // default
        expect(conv.messages).toEqual([]); // default
        expect(conv.pinned).toBe(false); // default
        expect(conv.archived).toBe(false); // default
      });

      it("filtra conversas sem campos obrigatórios", () => {
        setStoredSnapshot({
          schemaVersion: 1,
          updatedAt: new Date().toISOString(),
          conversationsByUser: {
            "user-1": [
              { id: "conv-1", title: "Válida" },
              { id: "conv-2" }, // Sem title
              { title: "Sem ID" }, // Sem id
            ] as any,
          },
        });

        const snapshot = loadConversationsSnapshot();
        expect(snapshot.conversationsByUser["user-1"]).toHaveLength(1);
        expect(snapshot.conversationsByUser["user-1"]![0]!.id).toBe("conv-1");
      });

      it("lida com campos ausentes em mensagens graciosamente", () => {
        setStoredSnapshot({
          schemaVersion: 1,
          updatedAt: new Date().toISOString(),
          conversationsByUser: {
            "user-1": [
              {
                id: "conv-1",
                title: "Test",
                messages: [
                  { id: "msg-1", content: "Hello" }, // role ausente
                  { id: "msg-2" }, // content ausente — será filtrada
                  { content: "No ID" }, // id ausente — será filtrada
                ],
              } as any,
            ],
          },
        });

        const snapshot = loadConversationsSnapshot();
        const messages = snapshot.conversationsByUser["user-1"]![0]!.messages;
        expect(messages).toHaveLength(1);
        expect(messages[0]!.id).toBe("msg-1");
        expect(messages[0]!.role).toBe("user"); // default
      });

      it("sanitiza role inválido para user", () => {
        setStoredSnapshot({
          schemaVersion: 1,
          updatedAt: new Date().toISOString(),
          conversationsByUser: {
            "user-1": [
              {
                id: "conv-1",
                title: "Test",
                messages: [
                  { id: "msg-1", role: "invalid", content: "Hello" },
                ],
              } as any,
            ],
          },
        });

        const snapshot = loadConversationsSnapshot();
        const msg = snapshot.conversationsByUser["user-1"]![0]!.messages[0]!;
        expect(msg.role).toBe("user");
      });

      it("migra schema antigo e persiste", () => {
        setStoredSnapshot({
          schemaVersion: 0,
          updatedAt: new Date().toISOString(),
          conversationsByUser: {
            "user-1": [
              {
                id: "conv-1",
                orgId: "org-1",
                userId: "user-1",
                title: "Old conversation",
                messages: [],
                pinned: false,
                archived: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          },
        });

        const snapshot = loadConversationsSnapshot();
        expect(snapshot.schemaVersion).toBe(1);

        const stored = getStoredSnapshot();
        expect(stored!.schemaVersion).toBe(1);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // saveConversationsSnapshot
  // ═══════════════════════════════════════════════════════════════════════════

  describe("saveConversationsSnapshot", () => {
    it("persiste snapshot no localStorage", () => {
      const initial = loadConversationsSnapshot();

      saveConversationsSnapshot({
        conversationsByUser: initial.conversationsByUser,
      });

      const stored = getStoredSnapshot();
      expect(stored).not.toBeNull();
      expect(stored!.conversationsByUser["user-1"]).toBeDefined();
    });

    it("atualiza schemaVersion", () => {
      const initial = loadConversationsSnapshot();

      saveConversationsSnapshot({
        conversationsByUser: initial.conversationsByUser,
      });

      const stored = getStoredSnapshot();
      expect(stored!.schemaVersion).toBe(1);
    });

    it("atualiza timestamp updatedAt", () => {
      const before = new Date().toISOString();
      const initial = loadConversationsSnapshot();

      saveConversationsSnapshot({
        conversationsByUser: initial.conversationsByUser,
      });

      const stored = getStoredSnapshot();
      expect(
        new Date(stored!.updatedAt).getTime(),
      ).toBeGreaterThanOrEqual(new Date(before).getTime());
    });

    it("retorna o snapshot salvo", () => {
      const initial = loadConversationsSnapshot();

      const result = saveConversationsSnapshot({
        conversationsByUser: initial.conversationsByUser,
      });

      expect(result.schemaVersion).toBe(1);
      expect(result.conversationsByUser["user-1"]).toBeDefined();
    });

    it("faz deep clone para prevenir mutações", () => {
      const initial = loadConversationsSnapshot();
      const newConv: Conversation = {
        id: "conv-new",
        orgId: "org-1",
        userId: "user-1",
        title: "Nova conversa",
        messages: [],
        pinned: false,
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      initial.conversationsByUser["user-1"]!.push(newConv);

      const result = saveConversationsSnapshot({
        conversationsByUser: initial.conversationsByUser,
      });

      // Mutate the original
      newConv.title = "Mutated";

      const stored = getStoredSnapshot();
      const saved = stored!.conversationsByUser["user-1"]!.find(
        (c) => c.id === "conv-new",
      );
      expect(saved!.title).toBe("Nova conversa");

      const returned = result.conversationsByUser["user-1"]!.find(
        (c) => c.id === "conv-new",
      );
      expect(returned!.title).toBe("Nova conversa");
    });

    it("pode adicionar novas conversas", () => {
      const initial = loadConversationsSnapshot();
      const newConv: Conversation = {
        id: "conv-added",
        orgId: "org-1",
        userId: "user-1",
        title: "Conversa adicionada",
        messages: [
          {
            id: "msg-1",
            role: "user",
            content: "Olá",
            createdAt: new Date().toISOString(),
          },
        ],
        pinned: false,
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      initial.conversationsByUser["user-1"]!.push(newConv);

      saveConversationsSnapshot({
        conversationsByUser: initial.conversationsByUser,
      });

      const stored = getStoredSnapshot();
      const added = stored!.conversationsByUser["user-1"]!.find(
        (c) => c.id === "conv-added",
      );
      expect(added).toBeDefined();
      expect(added!.title).toBe("Conversa adicionada");
      expect(added!.messages).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // resetConversationsSnapshot
  // ═══════════════════════════════════════════════════════════════════════════

  describe("resetConversationsSnapshot", () => {
    it("restaura dados seed", () => {
      // Primeiro, modifica o snapshot
      const initial = loadConversationsSnapshot();
      initial.conversationsByUser["user-1"] = [
        {
          id: "conv-custom",
          orgId: "org-1",
          userId: "user-1",
          title: "Custom",
          messages: [],
          pinned: false,
          archived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      saveConversationsSnapshot({
        conversationsByUser: initial.conversationsByUser,
      });

      // Verifica a modificação
      let stored = getStoredSnapshot();
      expect(stored!.conversationsByUser["user-1"]).toHaveLength(1);
      expect(stored!.conversationsByUser["user-1"]![0]!.title).toBe("Custom");

      // Reset
      const reset = resetConversationsSnapshot();

      // Verifica reset
      expect(reset.conversationsByUser["user-1"]).toHaveLength(3);
      expect(reset.conversationsByUser["user-1"]![0]!.title).toBe(
        "Preparação 1:1 com Ana",
      );

      stored = getStoredSnapshot();
      expect(stored!.conversationsByUser["user-1"]).toHaveLength(3);
    });

    it("retorna o snapshot seed", () => {
      const reset = resetConversationsSnapshot();
      expect(reset.schemaVersion).toBe(1);
      expect(reset.conversationsByUser["user-1"]).toBeDefined();
      expect(reset.conversationsByUser["user-1"]!.length).toBe(3);
    });

    it("persiste reset no localStorage", () => {
      resetConversationsSnapshot();

      const stored = getStoredSnapshot();
      expect(stored!.schemaVersion).toBe(1);
      expect(stored!.conversationsByUser["user-1"]).toHaveLength(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Estrutura dos dados seed
  // ═══════════════════════════════════════════════════════════════════════════

  describe("estrutura dos dados seed", () => {
    it("seed possui exatamente 3 conversas", () => {
      const snapshot = loadConversationsSnapshot();
      expect(snapshot.conversationsByUser["user-1"]).toHaveLength(3);
    });

    it("conversas seed possuem mensagens com roles válidos", () => {
      const snapshot = loadConversationsSnapshot();
      const conversations = snapshot.conversationsByUser["user-1"]!;
      for (const conv of conversations) {
        for (const msg of conv.messages) {
          expect(["user", "assistant"]).toContain(msg.role);
        }
      }
    });

    it("conversas seed possuem orgId e userId corretos", () => {
      const snapshot = loadConversationsSnapshot();
      const conversations = snapshot.conversationsByUser["user-1"]!;
      for (const conv of conversations) {
        expect(conv.orgId).toBe("org-1");
        expect(conv.userId).toBe("user-1");
      }
    });

    it("conversas seed possuem timestamps", () => {
      const snapshot = loadConversationsSnapshot();
      const conversations = snapshot.conversationsByUser["user-1"]!;
      for (const conv of conversations) {
        expect(conv.createdAt).toBeDefined();
        expect(conv.updatedAt).toBeDefined();
        expect(new Date(conv.createdAt).getTime()).toBeGreaterThan(0);
      }
    });

    it("mensagens seed possuem IDs únicos", () => {
      const snapshot = loadConversationsSnapshot();
      const conversations = snapshot.conversationsByUser["user-1"]!;
      const allMsgIds = conversations.flatMap((c) =>
        c.messages.map((m) => m.id),
      );
      const uniqueIds = new Set(allMsgIds);
      expect(uniqueIds.size).toBe(allMsgIds.length);
    });
  });
});
