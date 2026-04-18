import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import {
  Plus,
  MagnifyingGlass,
  PushPin,
  DotsThreeVertical,
  PencilSimple,
  Trash,
  Archive,
  ChatCircle,
  Lightning,
} from "@phosphor-icons/react";
import { Button, Input, Popover, Card } from "@getbud-co/buds";
import type { PopoverItem } from "@getbud-co/buds";
import { useConversations } from "@/contexts/ConversationsContext";
import styles from "./ConversationsTab.module.css";

// ─── Simple Markdown renderer ───

function MarkdownContent({ content }: { content: string }) {
  const html = content
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
    // Line breaks → paragraphs
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      // Unordered list
      if (/^- /.test(trimmed)) {
        const items = trimmed.split("\n").map((line) => {
          const text = line.replace(/^- /, "");
          return `<li>${text}</li>`;
        }).join("");
        return `<ul>${items}</ul>`;
      }
      // Ordered list
      if (/^\d+\. /.test(trimmed)) {
        const items = trimmed.split("\n").map((line) => {
          const text = line.replace(/^\d+\.\s*/, "");
          return `<li>${text}</li>`;
        }).join("");
        return `<ol>${items}</ol>`;
      }
      return `<p>${trimmed.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("");

  return <div className={styles.markdownContent} dangerouslySetInnerHTML={{ __html: html }} />;
}

// ─── Mock AI responses ───

const MOCK_RESPONSES = [
  "Ótima pergunta! Com base nos dados da sua equipe, sugiro focar nos OKRs de retenção e desenvolvimento. Quer que eu detalhe?",
  "Analisei os check-ins recentes do time. A frequência está boa, mas os temas poderiam ser mais variados. Posso sugerir pautas?",
  "Considerando o ciclo atual, recomendo revisar as metas de Q1 antes de definir Q2. Posso ajudar com o planejamento?",
  "Entendi! Vou preparar uma análise comparativa com base nos indicadores que você mencionou.",
  "Baseado nos padrões de engajamento, identifico 3 áreas de oportunidade para o time. Quer que eu elabore?",
];

function getMockResponse(): string {
  return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)] ?? MOCK_RESPONSES[0]!;
}

// ─── Date formatting ───

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays}d atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function getLastMessagePreview(
  messages: { role: string; content: string }[],
): string {
  if (messages.length === 0) return "Nenhuma mensagem ainda";
  const last = messages[messages.length - 1]!;
  const prefix = last.role === "user" ? "Você: " : "Bud: ";
  const text = prefix + last.content;
  return text.length > 60 ? text.slice(0, 57) + "..." : text;
}

// ─── Component ───

export function ConversationsTab() {
  const {
    conversations,
    activeConversation,
    setActiveConversationId,
    createConversation,
    deleteConversation,
    renameConversation,
    togglePin,
    archiveConversation,
    addMessage,
  } = useConversations();

  const [search, setSearch] = useState("");
  const [actionsPopover, setActionsPopover] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const actionsRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const renameInputRef = useRef<HTMLInputElement>(null);

  // ─── Filtered conversations ───

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, search]);

  const pinnedConversations = useMemo(
    () => filtered.filter((c) => c.pinned),
    [filtered],
  );
  const unpinnedConversations = useMemo(
    () => filtered.filter((c) => !c.pinned),
    [filtered],
  );

  // ─── Handlers ───

  const handleNewConversation = useCallback(() => {
    createConversation();
    setMobileSidebarOpen(false);
  }, [createConversation]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      setActiveConversationId(id);
      setMobileSidebarOpen(false);
    },
    [setActiveConversationId],
  );

  const handleRenameStart = useCallback(
    (id: string, currentTitle: string) => {
      setRenamingId(id);
      setRenameValue(currentTitle);
      setActionsPopover(null);
      requestAnimationFrame(() => renameInputRef.current?.focus());
    },
    [],
  );

  const handleRenameConfirm = useCallback(() => {
    if (renamingId && renameValue.trim()) {
      renameConversation(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue("");
  }, [renamingId, renameValue, renameConversation]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleRenameConfirm();
      if (e.key === "Escape") {
        setRenamingId(null);
        setRenameValue("");
      }
    },
    [handleRenameConfirm],
  );

  // ─── Popover actions ───

  function getConversationActions(conv: {
    id: string;
    title: string;
    pinned: boolean;
  }): PopoverItem[] {
    return [
      {
        id: "rename",
        label: "Renomear",
        icon: PencilSimple,
        onClick: () => handleRenameStart(conv.id, conv.title),
      },
      {
        id: "pin",
        label: conv.pinned ? "Desafixar" : "Fixar",
        icon: PushPin,
        onClick: () => {
          togglePin(conv.id);
          setActionsPopover(null);
        },
      },
      {
        id: "archive",
        label: "Arquivar",
        icon: Archive,
        onClick: () => {
          archiveConversation(conv.id);
          setActionsPopover(null);
        },
      },
      {
        id: "delete",
        label: "Excluir",
        icon: Trash,
        danger: true,
        onClick: () => {
          deleteConversation(conv.id);
          setActionsPopover(null);
        },
      },
    ];
  }

  // ─── ESC to close mobile sidebar ───

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && mobileSidebarOpen) {
        setMobileSidebarOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileSidebarOpen]);

  // ─── Render conversation item ───

  function renderConversationItem(conv: {
    id: string;
    title: string;
    pinned: boolean;
    messages: { role: string; content: string }[];
    updatedAt: string;
  }) {
    const isActive = activeConversation?.id === conv.id;
    const isRenaming = renamingId === conv.id;

    return (
      <div
        key={conv.id}
        className={`${styles.conversationItem} ${isActive ? styles.conversationItemActive : ""}`}
        onClick={() => !isRenaming && handleSelectConversation(conv.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isRenaming)
            handleSelectConversation(conv.id);
        }}
        aria-current={isActive ? "true" : undefined}
      >
        <div className={styles.conversationItemContent}>
          {isRenaming ? (
            <input
              ref={renameInputRef}
              className={styles.renameInput}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameConfirm}
              onKeyDown={handleRenameKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <span className={styles.conversationTitle}>
                {conv.pinned && (
                  <PushPin
                    size={12}
                    className={styles.pinIcon}
                    aria-label="Fixada"
                  />
                )}
                {conv.title}
              </span>
              <div className={styles.conversationMeta}>
                <span className={styles.conversationPreview}>
                  {getLastMessagePreview(conv.messages)}
                </span>
              </div>
              <span className={styles.conversationDate}>
                {formatRelativeDate(conv.updatedAt)}
              </span>
            </>
          )}
        </div>

        {!isRenaming && (
          <div className={styles.actionsButton}>
            <Button
              ref={(el: HTMLButtonElement | null) => {
                actionsRefs.current[conv.id] = el;
              }}
              variant="tertiary"
              size="sm"
              leftIcon={DotsThreeVertical}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setActionsPopover(
                  actionsPopover === conv.id ? null : conv.id,
                );
              }}
              aria-label={`Ações para ${conv.title}`}
            />
            <Popover
              items={getConversationActions(conv)}
              open={actionsPopover === conv.id}
              onClose={() => setActionsPopover(null)}
              anchorRef={{
                current: actionsRefs.current[conv.id] ?? null,
              }}
            />
          </div>
        )}
      </div>
    );
  }

  // ─── Sidebar content ───

  const sidebarContent = (
    <>
      <div className={styles.sidebarHeader}>
        <Button
          variant="primary"
          size="md"
          leftIcon={Plus}
          onClick={handleNewConversation}
        >
          Nova conversa
        </Button>
        <Input
          size="sm"
          leftIcon={MagnifyingGlass}
          placeholder="Buscar conversas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.conversationList}>
        {filtered.length === 0 ? (
          <div className={styles.emptySidebar}>
            <ChatCircle size={32} className={styles.emptyIcon} />
            <span className={styles.emptySidebarText}>
              {search
                ? "Nenhuma conversa encontrada"
                : "Nenhuma conversa ainda"}
            </span>
          </div>
        ) : (
          <>
            {pinnedConversations.length > 0 && (
              <>
                <div className={styles.sectionLabel}>Fixadas</div>
                {pinnedConversations.map(renderConversationItem)}
              </>
            )}
            {unpinnedConversations.length > 0 && (
              <>
                {pinnedConversations.length > 0 && (
                  <div className={styles.sectionLabel}>Recentes</div>
                )}
                {unpinnedConversations.map(renderConversationItem)}
              </>
            )}
          </>
        )}
      </div>
    </>
  );

  // ─── Chat input state ───

  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim() || !activeConversation || isSending) return;
    const text = chatInput.trim();
    setChatInput("");
    setIsSending(true);
    addMessage(activeConversation.id, "user", text);
    await new Promise((r) => setTimeout(r, 400));
    const response = getMockResponse();
    addMessage(activeConversation.id, "assistant", response);
    setIsSending(false);
  }, [chatInput, activeConversation, isSending, addMessage]);

  const handleChatKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage],
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages.length]);

  return (
    <div className={styles.container}>
      {/* Mobile backdrop */}
      <div
        className={`${styles.sidebarBackdrop} ${mobileSidebarOpen ? styles.sidebarBackdropVisible : ""}`}
        onClick={() => setMobileSidebarOpen(false)}
        aria-hidden
      />

      {/* Left card: Conversation list */}
      <Card padding="none" className={styles.sidebarCard}>
        <aside className={`${styles.sidebar} ${mobileSidebarOpen ? styles.sidebarOpen : ""}`}>
          {sidebarContent}
        </aside>
      </Card>

      {/* Right card: Chat area */}
      <Card padding="none" className={styles.chatCard}>
        <div className={styles.chatArea}>
          <div className={styles.mobileHeader}>
            <Button
              className={styles.mobileToggle}
              variant="secondary"
              size="md"
              leftIcon={ChatCircle}
              onClick={() => setMobileSidebarOpen(true)}
            >
              Conversas
            </Button>
          </div>

          {activeConversation ? (
            <>
              {/* Chat header */}
              <div className={styles.chatHeader}>
                <Lightning size={16} className={styles.chatHeaderIcon} />
                <span className={styles.chatHeaderTitle}>{activeConversation.title}</span>
              </div>

              {/* Messages */}
              <div className={styles.messageList}>
                {activeConversation.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`${styles.message} ${msg.role === "user" ? styles.messageUser : styles.messageAssistant}`}
                  >
                    <div className={styles.messageBubble}>
                      {msg.role === "assistant" ? (
                        <MarkdownContent content={msg.content} />
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className={`${styles.message} ${styles.messageAssistant}`}>
                    <div className={`${styles.messageBubble} ${styles.messageTyping}`}>
                      <span className={styles.typingDot} />
                      <span className={styles.typingDot} />
                      <span className={styles.typingDot} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className={styles.chatInputArea}>
                <input
                  className={styles.chatInputField}
                  placeholder="Pergunte ao Bud..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  disabled={isSending}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isSending}
                >
                  Enviar
                </Button>
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>
              <ChatCircle size={48} className={styles.emptyIcon} />
              <h3 className={styles.emptyTitle}>Converse com o Bud</h3>
              <p className={styles.emptyDescription}>
                Selecione uma conversa existente ou inicie uma nova para receber
                insights sobre desempenho, OKRs e gestão do seu time.
              </p>
              <Button
                variant="primary"
                size="md"
                leftIcon={Plus}
                onClick={handleNewConversation}
              >
                Nova conversa
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
