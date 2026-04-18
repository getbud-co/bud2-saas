import { useCallback, useMemo, useState, type ChangeEvent, type KeyboardEvent, type MutableRefObject } from "react";

interface MentionPerson {
  id: string;
  label: string;
  initials: string;
}

interface UseMissionMentionsParams {
  people: MentionPerson[];
  drawerNote: string;
  setDrawerNote: (value: string) => void;
  drawerNoteRef: MutableRefObject<HTMLTextAreaElement | null>;
}

export function useMissionMentions({
  people,
  drawerNote,
  setDrawerNote,
  drawerNoteRef,
}: UseMissionMentionsParams) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const mentionResults = useMemo(() => {
    if (mentionQuery === null) return [];
    return people.filter((person) => person.label.toLowerCase().includes(mentionQuery));
  }, [people, mentionQuery]);

  const detectMention = useCallback((text: string, cursorPos: number) => {
    const before = text.slice(0, cursorPos);
    const match = before.match(/@([\w\sÀ-ú]*)$/);
    if (match && match[1] !== undefined) {
      setMentionQuery(match[1].toLowerCase());
      setMentionIndex(0);
      return;
    }
    setMentionQuery(null);
  }, []);

  const insertMention = useCallback((person: MentionPerson) => {
    const textarea = drawerNoteRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart ?? drawerNote.length;
    const before = drawerNote.slice(0, cursor);
    const after = drawerNote.slice(cursor);
    const mentionStart = before.lastIndexOf("@");

    if (mentionStart === -1) return;

    const newText = `${before.slice(0, mentionStart)}@${person.label} ${after}`;
    setDrawerNote(newText);
    setMentionQuery(null);

    requestAnimationFrame(() => {
      const newPos = mentionStart + person.label.length + 2;
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    });
  }, [drawerNote, drawerNoteRef, setDrawerNote]);

  const handleNoteChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setDrawerNote(value);
    detectMention(value, e.target.selectionStart ?? value.length);
  }, [detectMention, setDrawerNote]);

  const handleNoteKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIndex((prev) => (prev + 1) % mentionResults.length);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex((prev) => (prev - 1 + mentionResults.length) % mentionResults.length);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const selected = mentionResults[mentionIndex];
      if (selected) insertMention(selected);
      return;
    }

    if (e.key === "Escape") {
      setMentionQuery(null);
    }
  }, [insertMention, mentionIndex, mentionResults]);

  return {
    mentionQuery,
    setMentionQuery,
    mentionIndex,
    mentionResults,
    insertMention,
    handleNoteChange,
    handleNoteKeyDown,
  };
}
