"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LinkedinLogo,
  InstagramLogo,
  XLogo,
  TiktokLogo,
  PinterestLogo,
  MetaLogo,
  ChatCircleText,
  GoogleLogo,
  YoutubeLogo,
  Plus,
  ArrowsClockwise,
  Trash,
  MagnifyingGlass,
  AddressBook,
} from "@phosphor-icons/react/ssr";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  handle: string | null;
  platform: string;
  profileUrl: string | null;
  avatarUrl: string | null;
  headline: string | null;
  source: string;
  lastEngagedAt: string | null;
  createdAt: string;
}

const PLATFORM_OPTIONS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "instagram", label: "Instagram" },
  { value: "x", label: "X (Twitter)" },
  { value: "tiktok", label: "TikTok" },
  { value: "pinterest", label: "Pinterest" },
  { value: "facebook", label: "Facebook" },
  { value: "threads", label: "Threads" },
  { value: "youtube", label: "YouTube" },
  { value: "bluesky", label: "Bluesky" },
];

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <InstagramLogo className="size-4" weight="fill" />,
  facebook: <MetaLogo className="size-4" weight="fill" />,
  x: <XLogo className="size-4" weight="fill" />,
  linkedin: <LinkedinLogo className="size-4" weight="fill" />,
  tiktok: <TiktokLogo className="size-4" weight="fill" />,
  pinterest: <PinterestLogo className="size-4" weight="fill" />,
  threads: <XLogo className="size-4" weight="fill" />,
  googleBusiness: <GoogleLogo className="size-4" weight="fill" />,
  youtube: <YoutubeLogo className="size-4" weight="fill" />,
  bluesky: <ChatCircleText className="size-4" weight="fill" />,
};

export default function ContactsSettingsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newPlatform, setNewPlatform] = useState("");
  const [newProfileUrl, setNewProfileUrl] = useState("");
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (platformFilter && platformFilter !== "all") params.set("platform", platformFilter);
      if (search) params.set("q", search);
      const res = await fetch(`/api/contacts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [platformFilter, search]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleAdd = async () => {
    if (!newName.trim() || !newPlatform) return;
    setAddSaving(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          platform: newPlatform,
          profileUrl: newProfileUrl.trim() || undefined,
          avatarUrl: newAvatarUrl.trim() || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Contact added");
        setAddDialogOpen(false);
        setNewName("");
        setNewPlatform("");
        setNewProfileUrl("");
        setNewAvatarUrl("");
        fetchContacts();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error("Failed to add contact", { description: (data as { error?: string }).error });
      }
    } catch {
      toast.error("Failed to add contact");
    } finally {
      setAddSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Contact deleted");
        setContacts((prev) => prev.filter((c) => c.id !== id));
      } else {
        toast.error("Failed to delete contact");
      }
    } catch {
      toast.error("Failed to delete contact");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/contacts/sync", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success("Contacts synced", {
          description: `${data.count ?? 0} contacts synced from engagements`,
        });
        fetchContacts();
      } else {
        toast.error("Failed to sync contacts");
      }
    } catch {
      toast.error("Failed to sync contacts");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-0">
      <PageHeader
        title="Contacts"
        description="Manage your saved contacts for mention autocomplete. Add contacts manually or sync from engagement data."
        backLink={{ href: "/settings", label: "Settings" }}
      >
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <MagnifyingGlass className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {PLATFORM_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            <ArrowsClockwise className={`size-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync from engagements"}
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="size-4" />
            Add Contact
          </Button>
        </div>
      </PageHeader>

      <Card className="rounded-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 tracking-tight">
            <AddressBook className="size-5 text-brand" weight="fill" />
            Saved Contacts
          </CardTitle>
          <CardDescription>
            Contacts appear in the mention autocomplete when composing posts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-sm border border-border p-4">
                  <div className="size-10 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-48 rounded bg-muted animate-pulse mt-1.5" />
                  </div>
                </div>
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-border p-8 text-center">
              <AddressBook className="size-8 text-muted-foreground" weight="light" />
              <p className="text-sm font-medium text-foreground">No contacts yet</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Add contacts manually or sync them from your engagement data to use in mention autocomplete.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Last Engaged</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarImage src={contact.avatarUrl ?? undefined} alt={contact.name} />
                          <AvatarFallback className="text-xs">
                            {contact.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{contact.name}</p>
                          {contact.handle && (
                            <p className="truncate text-xs text-muted-foreground">@{contact.handle}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1 normal-case">
                        {platformIcons[contact.platform]}
                        {contact.platform}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={contact.source === "engagement" ? "secondary" : "outline"}
                        className="normal-case"
                      >
                        {contact.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contact.lastEngagedAt
                        ? new Date(contact.lastEngagedAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(contact.id)}
                        disabled={deletingId === contact.id}
                      >
                        <Trash className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>
              Add a contact to appear in mention autocomplete when composing posts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="contact-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contact-name"
                placeholder="e.g. John Doe"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-platform">
                Platform <span className="text-destructive">*</span>
              </Label>
              <Select value={newPlatform} onValueChange={setNewPlatform}>
                <SelectTrigger id="contact-platform">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-profile-url">Profile URL</Label>
              <Input
                id="contact-profile-url"
                placeholder="e.g. https://www.linkedin.com/in/johndoe/"
                value={newProfileUrl}
                onChange={(e) => setNewProfileUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-avatar-url">Avatar URL</Label>
              <Input
                id="contact-avatar-url"
                placeholder="https://example.com/avatar.jpg"
                value={newAvatarUrl}
                onChange={(e) => setNewAvatarUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={addSaving || !newName.trim() || !newPlatform}>
              {addSaving ? "Adding..." : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
