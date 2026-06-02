'use client';

import { useState } from 'react';
import { Copy, Check } from '@phosphor-icons/react/ssr';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export function CopyButton({ text, label = 'Copy', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className={className}
      disabled={copied}
    >
      {copied ? (
        <Check weight="bold" className="w-4 h-4 text-success" />
      ) : (
        <Copy weight="bold" className="w-4 h-4" />
      )}
      {copied ? 'Copied' : label}
    </Button>
  );
}
