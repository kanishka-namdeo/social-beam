"use client";

import { Extension } from "@tiptap/core";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";

export interface InlineSuggestionOptions {
  /** The ghost text to render at cursor position. Cleared when empty/null. */
  suggestion?: string;
  /** Called when suggestion is accepted (Tab or mobile accept button) */
  onAccept?: (content: string) => void;
  /** Enable mobile accept button when touch device detected */
  isMobile?: boolean;
}

export interface InlineSuggestionStorage {
  currentSuggestion: string;
  editorRef: unknown;
  suggestionCursorPos: number;
  /** Ref to the ProseMirror view, set once the plugin view mounts. Used to dispatch suggestion updates from outside. */
  proseMirrorViewRef: EditorView | null;
  /** Cached onAccept to support external updates */
  cachedOnAccept?: (content: string) => void;
  /** Cached isMobile flag to support external updates */
  cachedIsMobile: boolean;
  /** The last suggestion that was rendered — used to detect duplicates */
  lastRenderedSuggestion: string;
}

export const INLINE_SUGGESTION_KEY = new PluginKey<DecorationSet>("inlineSuggestion");

export function updateSuggestionDecoration(view: EditorView, suggestion: string, onAccept?: (content: string) => void, isMobile?: boolean) {
  const cursorPos = view.state.selection.$head.pos;

  if (!suggestion || !suggestion.trim()) {
    const tr = view.state.tr.setMeta(INLINE_SUGGESTION_KEY, { decorations: DecorationSet.empty });
    view.dispatch(tr);
    return;
  }

  const acceptAction = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAccept) {
      onAccept(suggestion);
    }
    const insertTr = view.state.tr.insertText(suggestion, cursorPos);
    view.dispatch(insertTr);
    const clearTr = view.state.tr.setMeta(INLINE_SUGGESTION_KEY, { decorations: DecorationSet.empty });
    view.dispatch(clearTr);
  };

  const decoration = Decoration.widget(
    cursorPos,
    () => {
      const wrapper = document.createElement("span");
      wrapper.setAttribute("contenteditable", "false");
      wrapper.setAttribute("data-suggestion-wrapper", "true");
      wrapper.style.cssText = "pointer-events: none; position: relative; display: inline-block; max-width: 100%;";

      const span = document.createElement("span");
      span.textContent = suggestion;
      span.className = "ghost-suggestion-text";
      span.style.cssText = "color: oklch(from var(--muted-foreground) l c h / 0.45); display: inline;";
      wrapper.appendChild(span);

      // Accept button — always shown, positioned to the right of the ghost text
      const acceptBtn = document.createElement("span");
      acceptBtn.className = "ghost-suggestion-accept";
      acceptBtn.setAttribute("role", "button");
      acceptBtn.setAttribute("aria-label", "Accept suggestion (Tab)");
      acceptBtn.setAttribute("contenteditable", "false");
      acceptBtn.style.cssText =
        "pointer-events: auto; cursor: pointer; margin-left: 6px; display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 4px; border: 1px solid var(--border); background: var(--card); transition: all 0.15s ease; font-size: 12px; line-height: 1; color: var(--success); vertical-align: middle; flex-shrink: 0;";
      acceptBtn.textContent = "\u2713";
      acceptBtn.addEventListener("mouseenter", () => {
        acceptBtn.style.background = "oklch(from var(--success) l c h / 0.1)";
        acceptBtn.style.borderColor = "var(--success)";
      });
      acceptBtn.addEventListener("mouseleave", () => {
        acceptBtn.style.background = "var(--card)";
        acceptBtn.style.borderColor = "var(--border)";
      });
      acceptBtn.addEventListener("pointerdown", acceptAction);
      wrapper.appendChild(acceptBtn);

      return wrapper;
    },
    { side: 1 },
  );

  const decorations = DecorationSet.create(view.state.doc, [decoration]);
  const tr = view.state.tr.setMeta(INLINE_SUGGESTION_KEY, { decorations });
  view.dispatch(tr);
}

export const InlineSuggestion = Extension.create<InlineSuggestionOptions, InlineSuggestionStorage>({
  name: "inlineSuggestion",

  addOptions() {
    return {
      suggestion: undefined,
      onAccept: undefined,
      isMobile: false,
    };
  },

  addStorage() {
    return {
      currentSuggestion: "",
      editorRef: null,
      suggestionCursorPos: 0,
      proseMirrorViewRef: null,
      cachedOnAccept: undefined,
      cachedIsMobile: false,
      lastRenderedSuggestion: "",
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        const current = this.storage.currentSuggestion;
        if (!current) return false;

        const pos = this.storage.suggestionCursorPos;
        editor.chain().focus().insertContentAt(pos, current).run();

        this.storage.cachedOnAccept?.(current);
        this.storage.currentSuggestion = "";
        this.storage.lastRenderedSuggestion = "";
        this.options.suggestion = "";

        const view = this.storage.proseMirrorViewRef;
        if (view) {
          const tr = view.state.tr.setMeta(INLINE_SUGGESTION_KEY, { decorations: DecorationSet.empty });
          view.dispatch(tr);
        }

        return true;
      },
      Escape: () => {
        const current = this.storage.currentSuggestion;
        if (!current) return false;

        this.storage.currentSuggestion = "";
        this.storage.suggestionCursorPos = 0;
        this.storage.lastRenderedSuggestion = "";
        this.options.suggestion = "";

        const view = this.storage.proseMirrorViewRef;
        if (view) {
          const tr = view.state.tr.setMeta(INLINE_SUGGESTION_KEY, { decorations: DecorationSet.empty });
          view.dispatch(tr);
        }
        return true;
      },
      ArrowRight: () => {
        const current = this.storage.currentSuggestion;
        if (!current) return false;

        this.storage.currentSuggestion = "";
        this.storage.suggestionCursorPos = 0;
        this.storage.lastRenderedSuggestion = "";
        this.options.suggestion = "";

        const view = this.storage.proseMirrorViewRef;
        if (view) {
          const tr = view.state.tr.setMeta(INLINE_SUGGESTION_KEY, { decorations: DecorationSet.empty });
          view.dispatch(tr);
        }
        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    const extensionOptions = this.options;
    const extensionStorage = this.storage;

    return [
      new Plugin<DecorationSet>({
        key: INLINE_SUGGESTION_KEY,
        state: {
          init: (): DecorationSet => DecorationSet.empty,
          apply(tr: Transaction, old: DecorationSet): DecorationSet {
            const meta = tr.getMeta(INLINE_SUGGESTION_KEY) as { decorations?: DecorationSet } | undefined;
            if (meta?.decorations !== undefined) return meta.decorations;
            return old.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state: EditorState): DecorationSet | undefined {
            return INLINE_SUGGESTION_KEY.getState(state);
          },
        },
        view(view: EditorView) {
          extensionStorage.proseMirrorViewRef = view;
          extensionStorage.cachedOnAccept = extensionOptions.onAccept;
          extensionStorage.cachedIsMobile = extensionOptions.isMobile ?? false;
          let suggestionRendered = false;
          let docSizeWhenSuggestionSet = 0;

          return {
            update(updatedView: EditorView) {
              const docSize = updatedView.state.doc.content.size;
              const suggestion = extensionStorage.currentSuggestion;

              // If suggestion is active and document changed, user typed — dismiss
              if (suggestionRendered && docSize !== docSizeWhenSuggestionSet) {
                extensionStorage.currentSuggestion = "";
                extensionStorage.lastRenderedSuggestion = "";
                suggestionRendered = false;
                const tr = updatedView.state.tr.setMeta(INLINE_SUGGESTION_KEY, { decorations: DecorationSet.empty });
                updatedView.dispatch(tr);
                return;
              }

              if (!suggestion || !suggestion.trim()) {
                if (suggestionRendered) {
                  const tr = updatedView.state.tr.setMeta(INLINE_SUGGESTION_KEY, { decorations: DecorationSet.empty });
                  updatedView.dispatch(tr);
                  suggestionRendered = false;
                  extensionStorage.lastRenderedSuggestion = "";
                }
                return;
              }

              // Don't re-render the same suggestion
              if (suggestion === extensionStorage.lastRenderedSuggestion) return;
              extensionStorage.lastRenderedSuggestion = suggestion;
              extensionStorage.suggestionCursorPos = updatedView.state.selection.$head.pos;
              docSizeWhenSuggestionSet = docSize;
              suggestionRendered = true;

              updateSuggestionDecoration(updatedView, suggestion, extensionStorage.cachedOnAccept, extensionStorage.cachedIsMobile);
            },
          };
        },
      }),
    ];
  },
});
