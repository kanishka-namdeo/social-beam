"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Emoji from "@tiptap/extension-emoji";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Typography from "@tiptap/extension-typography";
import Mention from "@tiptap/extension-mention";
import { cn } from "@/lib/utils";
import { createMentionSuggestionPopup, type MentionSuggestion } from "./mention-suggestion-popup";
import { Toolbar } from "./toolbar/toolbar";
import { InlineSuggestion, updateSuggestionDecoration, INLINE_SUGGESTION_KEY } from "./inline-suggestion";
import type { InlineSuggestionStorage } from "./inline-suggestion";
import { DecorationSet } from "@tiptap/pm/view";

interface RichTextEditorProps {
  content?: string;
  onContentChange?: (html: string, textContent: string) => void;
  className?: string;
  placeholder?: string;
  /** Ghost text to render as inline suggestion */
  suggestionText?: string;
  /** Called when suggestion is accepted */
  onSuggestionAccept?: (content: string) => void;
  /** Called when suggestion is dismissed (Escape/typing) — clears React state */
  onSuggestionDismiss?: () => void;
  /** Whether to show mobile accept button */
  isMobile?: boolean;
  /** Selected platforms for filtering mention suggestions */
  selectedPlatforms?: string[];
}

export function RichTextEditor({
  content,
  onContentChange,
  className,
  placeholder = "Write your post content...",
  suggestionText,
  onSuggestionAccept,
  isMobile = false,
  selectedPlatforms = [],
}: RichTextEditorProps) {
  const isInitialMount = useRef(true);
  const lastContentRef = useRef(content);
  const onContentChangeRef = useRef(onContentChange);
  const onSuggestionAcceptRef = useRef(onSuggestionAccept);
  const suggestionDismissedRef = useRef(false);
  /** Tracks which suggestion text was dismissed — prevents re-rendering same suggestion from React state */
  const dismissedSuggestionTextRef = useRef<string | null>(null);
  /** AbortController for mention suggestion fetches — cancels previous request on new query */
  const mentionAbortRef = useRef<AbortController | null>(null);

  // Keep refs in sync with latest callbacks
  useEffect(() => {
    onContentChangeRef.current = onContentChange;
    onSuggestionAcceptRef.current = onSuggestionAccept;
  });

  // Clean up mention abort controller on unmount
  useEffect(() => {
    return () => {
      mentionAbortRef.current?.abort();
    };
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        code: false,
        horizontalRule: false,
        underline: false,
        link: false,
      }),
      Underline,
      TextAlign.configure({
        types: ["paragraph"],
        alignments: ["left", "center", "right", "justify"],
        defaultAlignment: "left",
      }),
      Emoji,
      Image.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-sm",
        },
      }),
      Link.configure({
        openOnClick: false,
        linkOnPaste: true,
        HTMLAttributes: {
          class: "text-brand underline underline-offset-2",
        },
      }),
      Typography,
      InlineSuggestion.configure({
        suggestion: suggestionText,
        onAccept: onSuggestionAccept,
        isMobile,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: "mention",
        },
        suggestion: {
          char: "@",
          items: async ({ query }) => {
            // Cancel any in-flight mention search before starting a new one
            mentionAbortRef.current?.abort();
            const controller = new AbortController();
            mentionAbortRef.current = controller;
            try {
              const platformsParam = selectedPlatforms.length > 0
                ? `&platforms=${selectedPlatforms.join(",")}`
                : "";
              const res = await fetch(
                `/api/mentions?q=${encodeURIComponent(query)}${platformsParam}`,
                { signal: controller.signal }
              );
              if (!res.ok) return [];
              return await res.json();
            } catch {
              return [];
            }
          },
          render: () => {
            let popup: ReturnType<typeof createMentionSuggestionPopup> | null = null;
            let commandFn: ((item: MentionSuggestion) => void) | null = null;

            return {
              onStart: (props: { items: MentionSuggestion[]; command: (item: MentionSuggestion) => void; clientRect?: (() => DOMRect | null) | null }) => {
                commandFn = props.command;
                popup = createMentionSuggestionPopup({
                  onSelect: (item: MentionSuggestion) => {
                    commandFn?.(item);
                  },
                });
                popup.onStart({ items: props.items, clientRect: props.clientRect });
              },
              onUpdate: (props: { items: MentionSuggestion[]; command: (item: MentionSuggestion) => void; clientRect?: (() => DOMRect | null) | null }) => {
                commandFn = props.command;
                popup?.onUpdate({ items: props.items, clientRect: props.clientRect });
              },
              onExit: () => {
                popup?.onExit();
                popup = null;
                commandFn = null;
              },
              onKeyDown: (props: { event: KeyboardEvent }) => {
                return popup?.onKeyDown(props) ?? false;
              },
            };
          },
        },
      }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const textContent = editor.state.doc.textContent;
      lastContentRef.current = html;
      onContentChangeRef.current?.(html, textContent);

      // Dismiss active suggestion when user types (works with Chrome DevTools type_text
      // which triggers TipTap transactions and fires onUpdate)
      const inlineSuggestion = editor.extensionManager?.extensions.find(
        (e) => e.name === "inlineSuggestion",
      );
      if (inlineSuggestion) {
        const storage = inlineSuggestion.storage as InlineSuggestionStorage | undefined;
        if (storage?.currentSuggestion) {
          suggestionDismissedRef.current = true;
          dismissedSuggestionTextRef.current = storage.currentSuggestion;
          storage.currentSuggestion = "";
          storage.lastRenderedSuggestion = "";
          const view = storage.proseMirrorViewRef;
          if (view) {
            const tr = view.state.tr.setMeta(INLINE_SUGGESTION_KEY, { decorations: DecorationSet.empty });
            view.dispatch(tr);
          }
        }
      }
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[200px] text-sm",
      },
      handleKeyDown: (view, event) => {
        // Check if there's an active suggestion to handle
        const inlineSuggestion = editor?.extensionManager?.extensions.find(
          (e) => e.name === "inlineSuggestion",
        );
        if (inlineSuggestion) {
          const storage = inlineSuggestion.storage as InlineSuggestionStorage | undefined;
          if (storage?.currentSuggestion) {
            if (event.key === "Tab") {
              event.preventDefault();
              event.stopPropagation();
              suggestionDismissedRef.current = true;
              const pos = storage.suggestionCursorPos;
              editor?.chain().focus().insertContentAt(pos, storage.currentSuggestion).run();
              storage.cachedOnAccept?.(storage.currentSuggestion);
              storage.currentSuggestion = "";
              storage.lastRenderedSuggestion = "";
              const tr = view.state.tr.setMeta(INLINE_SUGGESTION_KEY, { decorations: DecorationSet.empty });
              view.dispatch(tr);
              return true;
            }

            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              suggestionDismissedRef.current = true;
              storage.currentSuggestion = "";
              storage.lastRenderedSuggestion = "";
              const tr = view.state.tr.setMeta(INLINE_SUGGESTION_KEY, { decorations: DecorationSet.empty });
              view.dispatch(tr);
              return true;
            }

            // Dismiss suggestion on any printable key press (typing dismiss)
            // Only handle on keydown (not input) to dismiss before character is inserted
            if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
              suggestionDismissedRef.current = true;
              storage.currentSuggestion = "";
              storage.lastRenderedSuggestion = "";
              const tr = view.state.tr.setMeta(INLINE_SUGGESTION_KEY, { decorations: DecorationSet.empty });
              view.dispatch(tr);
              // Don't preventDefault — let the character be typed normally
            }
          }
        }

        // Prevent form submission on Enter, allow Shift+Enter for new line
        if (event.key === "Enter" && !event.shiftKey) {
          return false;
        }
        return false;
      },
    },
  });

  // Store editor ref in InlineSuggestion storage
  useEffect(() => {
    if (editor) {
      const inlineSuggestion = editor.extensionManager?.extensions.find((e) => e.name === "inlineSuggestion");
      if (inlineSuggestion) {
        (inlineSuggestion.storage as Record<string, unknown>).editorRef = editor;
      }
    }
  }, [editor]);

  // Dismiss suggestion on editor input (handles Chrome DevTools type_text/press_key
  // which bypass keydown handlers - the onUpdate callback above handles this)
  useEffect(() => {
    if (!editor) return;

    const handleInput = () => {
      const inlineSuggestion = editor.extensionManager?.extensions.find(
        (e) => e.name === "inlineSuggestion",
      );
      if (!inlineSuggestion) return;
      const storage = inlineSuggestion.storage as InlineSuggestionStorage | undefined;
      if (!storage?.currentSuggestion) return;

      suggestionDismissedRef.current = true;
      storage.currentSuggestion = "";
      storage.lastRenderedSuggestion = "";
      const view = storage.proseMirrorViewRef;
      if (view) {
        const tr = view.state.tr.setMeta(INLINE_SUGGESTION_KEY, { decorations: DecorationSet.empty });
        view.dispatch(tr);
      }
    };

    const domNode = editor.view?.dom;
    if (domNode) {
      domNode.addEventListener("input", handleInput);
      return () => domNode.removeEventListener("input", handleInput);
    }
  }, [editor]);

  // Global Escape dismiss — works regardless of where focus is
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const inlineSuggestion = editor?.extensionManager?.extensions.find(
        (ex) => ex.name === "inlineSuggestion",
      );
      if (!inlineSuggestion) return;
      const storage = inlineSuggestion.storage as InlineSuggestionStorage | undefined;
      if (!storage?.currentSuggestion) return;

      e.preventDefault();
      e.stopPropagation();
      storage.currentSuggestion = "";
      storage.lastRenderedSuggestion = "";
      if (editor?.view) {
        const tr = editor.view.state.tr.setMeta(INLINE_SUGGESTION_KEY, { decorations: DecorationSet.empty });
        editor.view.dispatch(tr);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [editor]);

  // Update InlineSuggestion when suggestionText changes
  useEffect(() => {
    if (!editor || !editor.view) {
      return;
    }
    const inlineSuggestion = editor.extensionManager?.extensions.find((e) => e.name === "inlineSuggestion");
    if (!inlineSuggestion) {
      return;
    }

    const storage = inlineSuggestion.storage as Record<string, unknown>;

    // If suggestion was dismissed by user action (typing/Escape), don't re-apply from React state
    // Reset dismissed flag when a GENUINELY NEW suggestion arrives (different from what was dismissed)
    if (suggestionText && suggestionText !== dismissedSuggestionTextRef.current) {
      // New suggestion arriving — reset dismissed flag
      suggestionDismissedRef.current = false;
      dismissedSuggestionTextRef.current = null;
    }

    if (suggestionDismissedRef.current) {
      return;
    }

    // Update storage with the new suggestion text and callbacks
    storage.currentSuggestion = suggestionText || "";
    storage.cachedOnAccept = onSuggestionAccept;
    storage.cachedIsMobile = isMobile;

    // Use editor.view directly (it IS the ProseMirror EditorView)
    updateSuggestionDecoration(editor.view, suggestionText || "", onSuggestionAccept, isMobile);
  }, [editor, suggestionText, onSuggestionAccept, isMobile]);

  // Sync external content changes to editor (only when different)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (editor && content !== undefined && content !== lastContentRef.current && content !== editor.getHTML()) {
      const { from, to } = editor.state.selection;
      editor.commands.setContent(content);
      // Restore cursor position if possible
      try {
        editor.commands.setTextSelection({ from: Math.min(from, editor.state.doc.content.size), to: Math.min(to, editor.state.doc.content.size) });
      } catch {
        // If position is invalid, move to end
        editor.commands.setTextSelection(editor.state.doc.content.size);
      }
    }
  }, [editor, content]);

  return (
    <div className={cn("overflow-hidden rounded-sm border border-border bg-background focus-within:border-brand focus-within:ring-1 focus-within:ring-brand/20 transition-all duration-200", className)}>
      <Toolbar editor={editor} />
      <EditorContainer editor={editor} placeholder={placeholder} />
    </div>
  );
}

function EditorContainer({
  editor,
  placeholder,
}: {
  editor: Editor | null;
  placeholder: string;
}) {
  return (
    <div
      className={cn(
        "relative min-h-[200px] bg-background px-4 py-3 text-sm",
        "prose prose-sm max-w-none dark:prose-invert",
        "[&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:focus:outline-none",
        "[&_.ProseMirror_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
        "[&_.ProseMirror_p.is-editor-empty:first-child]:before:pointer-events-none",
        "[&_.ProseMirror_p.is-editor-empty:first-child]:before:absolute",
        "[&_.ProseMirror_p.is-editor-empty:first-child]:before:text-muted-foreground",
        "[&_.ProseMirror_p.is-editor-empty:first-child]:before:text-sm",
        "[&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:h-auto [&_.ProseMirror_img]:rounded-sm",
        "[&_.ProseMirror_a]:text-brand [&_.ProseMirror_a]:underline [&_.ProseMirror_a]:underline-offset-2",
        "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ul]:my-2",
        "[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_ol]:my-2",
        "[&_.ProseMirror_li]:my-0.5",
        "[&_.ProseMirror_strong]:font-bold",
        "[&_.ProseMirror_em]:italic",
        "[&_.ProseMirror_u]:underline",
        "[&_.ProseMirror_s]:line-through",
        "[&_.ProseMirror_p]:my-1",
        // Mention styling
        "[&_.mention]:text-brand",
        "[&_.mention]:font-medium",
        "[&_.mention]:bg-brand/10",
        "[&_.mention]:rounded-sm",
        "[&_.mention]:px-0.5",
        // Ghost suggestion styling
        "[&_.ghost-suggestion-text]:text-muted-foreground",
        "[&_.ghost-suggestion-text]:opacity-50",
        "[&_.ghost-suggestion-text]:pointer-events-none",
        "[&_.ghost-suggestion-text]:select-none",
      )}
    >
      <EditorContent
        editor={editor}
        data-placeholder={placeholder}
      />
    </div>
  );
}
