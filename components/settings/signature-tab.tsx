"use client";

import { useCallback, useEffect, useState } from "react";
import { PenLine, Trash2, Star, Plus, Link as LinkIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { usePremium } from "@/hooks/use-premium";
import { FeatureGate } from "@/components/dashboard/feature-gate";

interface PostSignature {
  id: string;
  workspaceId: string;
  name: string | null;
  text: string;
  url: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export function SignatureTab() {
  const { isPremium, isAdmin, isFree } = usePremium();
  const isPremiumOrAdmin = isPremium || isAdmin;

  const [signatures, setSignatures] = useState<PostSignature[]>([]);
  const [signatureEnabled, setSignatureEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  // Form state
  const [newName, setNewName] = useState("");
  const [newText, setNewText] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchSignatures = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/signatures");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSignatures(data.signatures ?? []);
      setSignatureEnabled(data.signatureEnabled ?? true);
    } catch {
      toast.error("Failed to load signatures");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignatures();
  }, [fetchSignatures]);

  const handleToggleEnabled = async (checked: boolean) => {
    setToggling(true);
    try {
      const res = await fetch("/api/settings/signatures/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureEnabled: checked }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      setSignatureEnabled(checked);
      toast.success(checked ? "Signature enabled" : "Signature disabled");
    } catch {
      toast.error("Failed to update setting");
    } finally {
      setToggling(false);
    }
  };

  const handleCreate = async () => {
    if (!newText.trim()) {
      toast.error("Signature text is required");
      return;
    }
    if (newText.length > 500) {
      toast.error("Signature text must be 500 characters or less");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/signatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim() || undefined,
          text: newText.trim(),
          url: newUrl.trim() || undefined,
          isDefault: signatures.length === 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }
      toast.success("Signature created");
      setNewName("");
      setNewText("");
      setNewUrl("");
      await fetchSignatures();
    } catch (err: any) {
      toast.error(err.message || "Failed to create signature");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/settings/signatures", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Signature deleted");
      await fetchSignatures();
    } catch {
      toast.error("Failed to delete signature");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/settings/signatures/${id}`, {
        method: "PUT",
      });
      if (!res.ok) throw new Error("Failed to set default");
      toast.success("Default signature updated");
      await fetchSignatures();
    } catch {
      toast.error("Failed to set default");
    }
  };

  const startEdit = (sig: PostSignature) => {
    setEditingId(sig.id);
    setEditName(sig.name ?? "");
    setEditText(sig.text);
    setEditUrl(sig.url ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditText("");
    setEditUrl("");
  };

  const handleUpdate = async (id: string) => {
    if (!editText.trim()) {
      toast.error("Signature text is required");
      return;
    }
    if (editText.length > 500) {
      toast.error("Signature text must be 500 characters or less");
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch(`/api/settings/signatures/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim() || undefined,
          text: editText.trim(),
          url: editUrl.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Signature updated");
      cancelEdit();
      await fetchSignatures();
    } catch {
      toast.error("Failed to update signature");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Card className="rounded-sm">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isFree) {
    return (
      <div className="space-y-4">
        <Card className="rounded-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 tracking-tight">
              <PenLine className="size-5 text-brand" />
              Post Signature
            </CardTitle>
            <CardDescription>
              Your posts can include a SocialBeam signature to help grow our community.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-sm border border-border p-3">
              <div>
                <p className="text-sm font-medium tracking-tight">Include SocialBeam signature</p>
                <p className="text-xs text-muted-foreground">
                  Keeping the signature helps SocialBeam grow — thanks for your support!
                </p>
              </div>
              <Switch
                checked={signatureEnabled}
                onCheckedChange={handleToggleEnabled}
                disabled={toggling}
              />
            </div>
            {signatureEnabled && (
              <div className="rounded-sm border border-border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">
                  Written with{" "}
                  <a
                    href="https://socialbeam.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand hover:underline font-medium"
                  >
                    SocialBeam
                  </a>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <FeatureGate
          isPremium={false}
          featureName="Customize your signature"
          description="Create custom post signatures, manage multiple variants, and control how your posts are signed off."
          variant="card"
        />
      </div>
    );
  }

  const defaultSignature = signatures.find((s) => s.isDefault);
  const atLimit = signatures.length >= 5;

  return (
    <div className="space-y-4">
      {/* Master toggle */}
      <Card className="rounded-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 tracking-tight">
            <PenLine className="size-5 text-brand" />
            Post Signature
          </CardTitle>
          <CardDescription>
            Manage the signature appended to your social media posts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-sm border border-border p-3">
            <div>
              <p className="text-sm font-medium tracking-tight">Include signature on posts</p>
              <p className="text-xs text-muted-foreground">
                When enabled, your default signature will be appended to new posts.
              </p>
            </div>
            <Switch
              checked={signatureEnabled}
              onCheckedChange={handleToggleEnabled}
              disabled={toggling}
            />
          </div>

          {/* Default signature selector */}
          {signatures.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium tracking-tight">Default Signature</Label>
              <Select
                value={defaultSignature?.id ?? ""}
                onValueChange={(id) => handleSetDefault(id)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a default signature" />
                </SelectTrigger>
                <SelectContent>
                  {signatures.map((sig) => (
                    <SelectItem key={sig.id} value={sig.id}>
                      {sig.name || sig.text.slice(0, 30) + (sig.text.length > 30 ? "..." : "")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saved signatures list */}
      <Card className="rounded-sm">
        <CardHeader>
          <CardTitle className="text-base tracking-tight">Your Signatures</CardTitle>
          <CardDescription>
            {signatures.length} of 5 signatures used
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {signatures.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-border p-8 text-center">
              <PenLine className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No custom signatures yet. Create one below.
              </p>
            </div>
          ) : (
            signatures.map((sig) => (
              <div key={sig.id}>
                {editingId === sig.id ? (
                  <div className="rounded-sm border border-brand/30 bg-accent/20 p-4 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor={`edit-name-${sig.id}`}>Name (optional)</Label>
                      <Input
                        id={`edit-name-${sig.id}`}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="e.g. Professional, Casual"
                        maxLength={50}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`edit-text-${sig.id}`}>Signature text</Label>
                      <Textarea
                        id={`edit-text-${sig.id}`}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        placeholder="Written with SocialBeam"
                        maxLength={500}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {editText.length}/500
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`edit-url-${sig.id}`}>URL (optional)</Label>
                      <Input
                        id={`edit-url-${sig.id}`}
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        placeholder="https://socialbeam.app"
                        type="url"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(sig.id)}
                        disabled={updating || !editText.trim()}
                      >
                        {updating ? "Saving..." : "Save"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-sm border border-border p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {sig.name || "Unnamed"}
                        </p>
                        {sig.isDefault && (
                          <Badge variant="outline" className="text-micro bg-brand/10 text-brand border-brand/30 shrink-0">
                            <Star className="size-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!sig.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-8 p-0"
                            onClick={() => handleSetDefault(sig.id)}
                            title="Set as default"
                          >
                            <Star className="size-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0"
                          onClick={() => startEdit(sig)}
                          title="Edit"
                        >
                          <PenLine className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(sig.id)}
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                      {sig.text}
                    </p>
                    {sig.url && (
                      <div className="flex items-center gap-1 text-xs text-brand">
                        <LinkIcon className="size-3" />
                        <a
                          href={sig.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline truncate"
                        >
                          {sig.url}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Add new signature */}
      <Card className="rounded-sm">
        <CardHeader>
          <CardTitle className="text-base tracking-tight flex items-center gap-2">
            <Plus className="size-4" />
            Add New Signature
          </CardTitle>
          <CardDescription>
            Create a new signature variant for your posts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {atLimit ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">Maximum 5 signatures reached</p>
              <p className="text-xs text-muted-foreground">
                Delete an existing signature to create a new one.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="new-sig-name">Name (optional)</Label>
                <Input
                  id="new-sig-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Professional, Casual"
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-sig-text">Signature text</Label>
                <Textarea
                  id="new-sig-text"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Written with SocialBeam"
                  maxLength={500}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {newText.length}/500
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-sig-url">URL (optional)</Label>
                <Input
                  id="new-sig-url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://socialbeam.app"
                  type="url"
                />
              </div>

              {/* Live preview */}
              {newText.trim() && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Preview</Label>
                  <div className="rounded-sm border border-border bg-muted/30 p-3">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                      {newText}
                    </p>
                    {newUrl.trim() && (
                      <div className="flex items-center gap-1 text-xs text-brand mt-1">
                        <LinkIcon className="size-3" />
                        <span className="truncate">{newUrl.trim()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button
                onClick={handleCreate}
                disabled={saving || !newText.trim()}
                className="w-full"
              >
                {saving ? "Creating..." : "Create Signature"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
