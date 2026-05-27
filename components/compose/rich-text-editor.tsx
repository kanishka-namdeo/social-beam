"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Emoji from "@tiptap/extension-emoji";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Typography from "@tiptap/extension-typography";
import { cn } from "@/lib/utils";
import { Toolbar } from "./toolbar/toolbar";

interface RichTextEditorProps {
  content?: string;
  onContentChange?: (html: string, textContent: string) => void;
  className?: string;
  placeholder?: string;
}

export function RichTextEditor({
  content,
  onContentChange,
  className,
  placeholder = "Write your post content...",
}: RichTextEditorProps) {
  const isInitialMount = useRef(true);
  const lastContentRef = useRef(content);

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
          class: "max-w-full h-auto rounded-md",
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
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const textContent = editor.state.doc.textContent;
      lastContentRef.current = html;
      onContentChange?.(html, textContent);
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[200px] text-sm",
      },
      handleKeyDown: (view, event) => {
        // Prevent form submission on Enter, allow Shift+Enter for new line
        if (event.key === "Enter" && !event.shiftKey) {
          return false;
        }
        return false;
      },
    },
  });

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
    <div className={cn("overflow-hidden rounded-lg border border-border focus-within:border-brand transition-colors", className)}>
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
        "relative min-h-[200px] bg-background px-3 py-3 text-sm",
        "prose prose-sm max-w-none dark:prose-invert",
        "[&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:focus:outline-none",
        "[&_.ProseMirror_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
        "[&_.ProseMirror_p.is-editor-empty:first-child]:before:pointer-events-none",
        "[&_.ProseMirror_p.is-editor-empty:first-child]:before:absolute",
        "[&_.ProseMirror_p.is-editor-empty:first-child]:before:text-muted-foreground",
        "[&_.ProseMirror_p.is-editor-empty:first-child]:before:text-sm",
        "[&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:h-auto [&_.ProseMirror_img]:rounded-md",
        "[&_.ProseMirror_a]:text-brand [&_.ProseMirror_a]:underline [&_.ProseMirror_a]:underline-offset-2",
        "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ul]:my-2",
        "[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_ol]:my-2",
        "[&_.ProseMirror_li]:my-0.5",
        "[&_.ProseMirror_strong]:font-bold",
        "[&_.ProseMirror_em]:italic",
        "[&_.ProseMirror_u]:underline",
        "[&_.ProseMirror_s]:line-through",
        "[&_.ProseMirror_p]:my-1",
      )}
    >
      <EditorContent
        editor={editor}
        data-placeholder={placeholder}
      />
    </div>
  );
}
