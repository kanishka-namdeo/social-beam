"use client";

import type { Editor } from "@tiptap/react";
import {
  TextB,
  TextItalic,
  TextUnderline,
  TextStrikethrough,
  Image,
  LinkSimple,
  ArrowUUpLeft,
  ArrowUUpRight,
  Eraser,
  ListBullets,
  ListNumbers,
  TextAlignLeft,
  TextAlignCenter,
  TextAlignRight,
  TextAlignJustify,
  CaretDown,
} from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { EmojiPicker } from "./emoji-picker";

interface ToolbarProps {
  editor: Editor | null;
}

type Alignment = "left" | "center" | "right" | "justify";

const ALIGNMENT_ICONS: Record<Alignment, typeof TextAlignLeft> = {
  left: TextAlignLeft,
  center: TextAlignCenter,
  right: TextAlignRight,
  justify: TextAlignJustify,
};

const ALIGNMENT_LABELS: Record<Alignment, string> = {
  left: "Align left",
  center: "Align center",
  right: "Align right",
  justify: "Justify",
};

export function Toolbar({ editor }: ToolbarProps) {
  if (!editor) return null;

  const currentAlignment = editor.isActive({ textAlign: "left" })
    ? "left"
    : editor.isActive({ textAlign: "center" })
      ? "center"
      : editor.isActive({ textAlign: "right" })
        ? "right"
        : editor.isActive({ textAlign: "justify" })
          ? "justify"
          : "left";

  const handleInsertEmoji = (emoji: string) => {
    editor.chain().focus().insertContent(emoji).run();
  };

  const handleInsertImage = () => {
    const url = window.prompt("Enter image URL:");
    if (!url?.trim()) return;

    // Basic URL validation for images
    let imageUrl = url.trim();
    if (!/^https?:\/\//i.test(imageUrl) && !imageUrl.startsWith("/")) {
      imageUrl = `https://${imageUrl}`;
    }

    // Validate image extension or allow any URL (for flexibility)
    const isImageUrl = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(imageUrl) ||
                       /^https?:\/\//i.test(imageUrl);

    if (!isImageUrl) {
      const proceed = window.confirm("This doesn't look like an image URL. Insert anyway?");
      if (!proceed) return;
    }

    editor.chain().focus().setImage({ src: imageUrl }).run();
  };

  const handleInsertLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter link URL:", previousUrl ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    // Basic URL validation - add https:// if no protocol
    let validatedUrl = url.trim();
    if (!/^https?:\/\//i.test(validatedUrl) && !/^mailto:/i.test(validatedUrl)) {
      validatedUrl = `https://${validatedUrl}`;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: validatedUrl }).run();
  };

  const handleClearFormatting = () => {
    // Clear marks AND reset text alignment
    editor.chain()
      .focus()
      .unsetAllMarks()
      .setTextAlign("left")
      .run();
  };

  const buttonClass = (active: boolean = false) =>
    cn(
      "h-8 w-8 p-0 rounded-md transition-colors",
      active
        ? "text-foreground bg-muted"
        : "text-muted-foreground hover:text-foreground hover:bg-muted",
    );

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
      {/* Bold */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={buttonClass(editor.isActive("bold"))}
        onClick={() => editor.chain().focus().toggleBold().run()}
        aria-label="Bold"
        disabled={!editor.can().toggleBold()}
      >
        <TextB className="size-4" weight="bold" />
      </Button>

      {/* Italic */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={buttonClass(editor.isActive("italic"))}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italic"
        disabled={!editor.can().toggleItalic()}
      >
        <TextItalic className="size-4" weight="bold" />
      </Button>

      {/* Underline */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={buttonClass(editor.isActive("underline"))}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        aria-label="Underline"
        disabled={!editor.can().toggleUnderline()}
      >
        <TextUnderline className="size-4" weight="bold" />
      </Button>

      {/* Strikethrough */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={buttonClass(editor.isActive("strike"))}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Strikethrough"
        disabled={!editor.can().toggleStrike()}
      >
        <TextStrikethrough className="size-4" weight="bold" />
      </Button>

      {/* Emoji picker */}
      <EmojiPicker onInsert={handleInsertEmoji} />

      {/* Image */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={buttonClass()}
        onClick={handleInsertImage}
        aria-label="Insert image"
      >
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image className="size-4" />
      </Button>

      {/* Link */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={buttonClass(editor.isActive("link"))}
        onClick={handleInsertLink}
        aria-label="Insert link"
      >
        <LinkSimple className="size-4" />
      </Button>

      {/* Separator */}
      <div className="mx-1 h-5 w-px bg-border" />

      {/* Undo */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={buttonClass()}
        onClick={() => editor.chain().focus().undo().run()}
        aria-label="Undo"
        disabled={!editor.can().undo()}
      >
        <ArrowUUpLeft className="size-4" />
      </Button>

      {/* Redo */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={buttonClass()}
        onClick={() => editor.chain().focus().redo().run()}
        aria-label="Redo"
        disabled={!editor.can().redo()}
      >
        <ArrowUUpRight className="size-4" />
      </Button>

      {/* Clear formatting */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={buttonClass()}
        onClick={handleClearFormatting}
        aria-label="Clear formatting"
      >
        <Eraser className="size-4" />
      </Button>

      {/* Separator */}
      <div className="mx-1 h-5 w-px bg-border" />

      {/* Unordered list */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={buttonClass(editor.isActive("bulletList"))}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Bullet list"
        disabled={!editor.can().toggleBulletList()}
      >
        <ListBullets className="size-4" />
      </Button>

      {/* Ordered list */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={buttonClass(editor.isActive("orderedList"))}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Numbered list"
        disabled={!editor.can().toggleOrderedList()}
      >
        <ListNumbers className="size-4" />
      </Button>

      {/* Text alignment dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={buttonClass()}
            aria-label="Text alignment"
          >
            {(() => {
              const Icon = ALIGNMENT_ICONS[currentAlignment];
              return <Icon className="size-4" />;
            })()}
            <CaretDown className="size-3 ml-px" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          {(Object.keys(ALIGNMENT_ICONS) as Alignment[]).map((align) => {
            const Icon = ALIGNMENT_ICONS[align];
            return (
              <DropdownMenuItem
                key={align}
                className={cn(
                  "flex items-center gap-2",
                  currentAlignment === align && "bg-muted",
                )}
                onClick={() => editor.chain().focus().setTextAlign(align).run()}
              >
                <Icon className="size-4" />
                <span>{ALIGNMENT_LABELS[align]}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
