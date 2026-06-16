"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Signature {
  id: string;
  name: string | null;
  text: string;
  url: string | null;
  isDefault: boolean;
}

interface SignatureSelectorProps {
  isPremium: boolean;
  signatures: Signature[];
  signatureEnabled: boolean;
  selectedSignatureId: string | null;
  onSignatureIdChange: (id: string | null) => void;
  localSignatureEnabled: boolean;
  onSignatureEnabledChange: (enabled: boolean) => void;
}

export function SignatureSelector({
  isPremium,
  signatures,
  signatureEnabled,
  selectedSignatureId,
  onSignatureIdChange,
  localSignatureEnabled,
  onSignatureEnabledChange,
}: SignatureSelectorProps) {
  if (!signatureEnabled) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-sm border border-border/50 bg-muted/20 px-3 py-2">
        <div className="flex items-center gap-2">
          <Switch
            id="signature-toggle"
            checked={localSignatureEnabled}
            onCheckedChange={onSignatureEnabledChange}
          />
          <Label htmlFor="signature-toggle" className="text-xs text-muted-foreground cursor-pointer">
            Add signature
          </Label>
        </div>
        {localSignatureEnabled && signatures.length > 0 && (
          <Select value={selectedSignatureId ?? ""} onValueChange={(v) => onSignatureIdChange(v || null)}>
            <SelectTrigger className="h-7 w-[180px] text-xs">
              <SelectValue placeholder="Select signature" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No signature</SelectItem>
              {signatures.map((sig) => (
                <SelectItem key={sig.id} value={sig.id}>
                  {sig.name || sig.text.slice(0, 30)}
                  {sig.isDefault ? " (default)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {!isPremium && (
        <p className="text-xs text-muted-foreground px-1">
          Keeping the signature helps SocialBeam grow — thanks for your support!
        </p>
      )}
    </div>
  );
}
