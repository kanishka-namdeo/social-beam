"use client";

import { useState } from "react";
import { Lightbulb, Sparkle, Plus } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { IdeaCard } from "./idea-card";
import { GenerateIdeasDialog } from "./generate-ideas-dialog";
import type { Idea } from "@/app/generated/prisma";
import { IdeaStatus } from "@/app/generated/prisma";

interface IdeasBoardProps {
  initialIdeas: Idea[];
}

const COLUMNS: { status: IdeaStatus; title: string; icon: any; color: string }[] = [
  { status: "NEW", title: "New Ideas", icon: Lightbulb, color: "text-blue-600" },
  { status: "PLACED", title: "On Calendar", icon: Lightbulb, color: "text-purple-600" },
  { status: "CONVERTED", title: "Converted", icon: Sparkle, color: "text-green-600" },
  { status: "DISMISSED", title: "Dismissed", icon: Lightbulb, color: "text-gray-600" },
];

export function IdeasBoard({ initialIdeas }: IdeasBoardProps) {
  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [convertingIdea, setConvertingIdea] = useState<Idea | null>(null);
  const [placingIdea, setPlacingIdea] = useState<Idea | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [draggedIdea, setDraggedIdea] = useState<Idea | null>(null);

  // New idea dialog state
  const [newIdeaDialogOpen, setNewIdeaDialogOpen] = useState(false);
  const [newIdea, setNewIdea] = useState({
    title: "",
    content: "",
    category: "",
  });

  const handleCreateIdea = async () => {
    try {
      const response = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newIdea.title,
          content: newIdea.content || undefined,
          category: newIdea.category || undefined,
          source: "MANUAL",
        }),
      });

      if (!response.ok) throw new Error("Failed to create idea");

      const created = await response.json();
      setIdeas((prev) => [created, ...prev]);
      toast.success("Idea created");
      setNewIdeaDialogOpen(false);
      setNewIdea({ title: "", content: "", category: "" });
    } catch (error) {
      toast.error("Failed to create idea");
    }
  };

  const handleUpdateIdea = async (idea: Idea) => {
    try {
      const response = await fetch("/api/ideas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(idea),
      });

      if (!response.ok) throw new Error("Failed to update idea");

      const updated = await response.json();
      setIdeas((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      toast.success("Idea updated");
      setEditingIdea(null);
    } catch (error) {
      toast.error("Failed to update idea");
    }
  };

  const handleDeleteIdea = async (id: string) => {
    if (!confirm("Delete this idea?")) return;

    try {
      const response = await fetch(`/api/ideas?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete idea");

      setIdeas((prev) => prev.filter((i) => i.id !== id));
      toast.success("Idea deleted");
    } catch (error) {
      toast.error("Failed to delete idea");
    }
  };

  const handleConvertIdea = async (idea: Idea) => {
    setConvertingIdea(idea);
  };

  const confirmConvertIdea = async () => {
    if (!convertingIdea) return;

    try {
      const response = await fetch(`/api/ideas/${convertingIdea.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms: ["linkedin"], // Default platform
        }),
      });

      if (!response.ok) throw new Error("Failed to convert idea");

      const { postId } = await response.json();
      setIdeas((prev) =>
        prev.map((i) =>
          i.id === convertingIdea.id
            ? { ...i, status: "CONVERTED" as IdeaStatus, convertedToPostId: postId }
            : i
        )
      );
      toast.success("Idea converted to post");
      setConvertingIdea(null);
    } catch (error) {
      toast.error("Failed to convert idea");
    }
  };

  const handlePlaceOnCalendar = async (idea: Idea) => {
    setPlacingIdea(idea);
  };

  const confirmPlaceOnCalendar = async () => {
    if (!placingIdea) return;

    try {
      const response = await fetch("/api/ideas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: placingIdea.id,
          status: "PLACED",
        }),
      });

      if (!response.ok) throw new Error("Failed to place idea");

      const updated = await response.json();
      setIdeas((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      toast.success("Idea placed on calendar");
      setPlacingIdea(null);
    } catch (error) {
      toast.error("Failed to place idea");
    }
  };

  const handleGenerateIdeas = async (generatedIdeas: Array<{
    title: string;
    content: string;
    category: string;
    source: "AI_GENERATED";
  }>) => {
    try {
      const createdIdeas = await Promise.all(
        generatedIdeas.map((idea) =>
          fetch("/api/ideas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(idea),
          }).then((res) => res.json())
        )
      );

      setIdeas((prev) => [...createdIdeas, ...prev]);
    } catch (error) {
      toast.error("Failed to save generated ideas");
    }
  };

  const handleDragStart = (idea: Idea) => {
    setDraggedIdea(idea);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (status: IdeaStatus) => {
    if (!draggedIdea || draggedIdea.status === status) {
      setDraggedIdea(null);
      return;
    }

    try {
      const response = await fetch("/api/ideas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draggedIdea.id,
          status,
        }),
      });

      if (!response.ok) throw new Error("Failed to update idea status");

      const updated = await response.json();
      setIdeas((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      toast.success(`Moved to ${COLUMNS.find((c) => c.status === status)?.title}`);
    } catch (error) {
      toast.error("Failed to move idea");
    } finally {
      setDraggedIdea(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex gap-3">
        <Button onClick={() => setGenerateDialogOpen(true)}>
          <Sparkle className="w-4 h-4 mr-2" weight="fill" />
          Generate Ideas
        </Button>
        <Button variant="outline" onClick={() => setNewIdeaDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Idea
        </Button>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((column) => {
          const columnIdeas = ideas.filter((idea) => idea.status === column.status);
          const Icon = column.icon;

          return (
            <Card
              key={column.status}
              className="min-h-[400px]"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column.status)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Icon className={`w-4 h-4 ${column.color}`} weight="fill" />
                  {column.title}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {columnIdeas.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {columnIdeas.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No ideas yet
                  </div>
                ) : (
                  columnIdeas.map((idea) => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      onEdit={setEditingIdea}
                      onDelete={handleDeleteIdea}
                      onConvert={handleConvertIdea}
                      onPlaceOnCalendar={handlePlaceOnCalendar}
                      draggable
                      onDragStart={() => handleDragStart(idea)}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* New idea dialog */}
      <Dialog open={newIdeaDialogOpen} onOpenChange={setNewIdeaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Idea</DialogTitle>
            <DialogDescription>
              Capture a new content idea for later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newIdea.title}
                onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                placeholder="e.g., Share our team's remote work tips"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content (optional)</Label>
              <Textarea
                id="content"
                value={newIdea.content}
                onChange={(e) => setNewIdea({ ...newIdea, content: e.target.value })}
                placeholder="Add details about this idea..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category (optional)</Label>
              <Select
                value={newIdea.category}
                onValueChange={(value) => setNewIdea({ ...newIdea, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Educational">Educational</SelectItem>
                  <SelectItem value="Behind the Scenes">Behind the Scenes</SelectItem>
                  <SelectItem value="Industry News">Industry News</SelectItem>
                  <SelectItem value="Tips & Tricks">Tips & Tricks</SelectItem>
                  <SelectItem value="Case Study">Case Study</SelectItem>
                  <SelectItem value="Thought Leadership">Thought Leadership</SelectItem>
                  <SelectItem value="User Generated Content">User Generated Content</SelectItem>
                  <SelectItem value="Product Update">Product Update</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewIdeaDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateIdea} disabled={!newIdea.title.trim()}>
              Create Idea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit idea dialog */}
      <Dialog open={!!editingIdea} onOpenChange={() => setEditingIdea(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Idea</DialogTitle>
            <DialogDescription>
              Update your content idea.
            </DialogDescription>
          </DialogHeader>
          {editingIdea && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingIdea.title}
                  onChange={(e) =>
                    setEditingIdea({ ...editingIdea, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-content">Content</Label>
                <Textarea
                  id="edit-content"
                  value={editingIdea.content || ""}
                  onChange={(e) =>
                    setEditingIdea({ ...editingIdea, content: e.target.value })
                  }
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={editingIdea.category || ""}
                  onValueChange={(value) =>
                    setEditingIdea({ ...editingIdea, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Educational">Educational</SelectItem>
                    <SelectItem value="Behind the Scenes">Behind the Scenes</SelectItem>
                    <SelectItem value="Industry News">Industry News</SelectItem>
                    <SelectItem value="Tips & Tricks">Tips & Tricks</SelectItem>
                    <SelectItem value="Case Study">Case Study</SelectItem>
                    <SelectItem value="Thought Leadership">Thought Leadership</SelectItem>
                    <SelectItem value="User Generated Content">User Generated Content</SelectItem>
                    <SelectItem value="Product Update">Product Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingIdea(null)}>
              Cancel
            </Button>
            <Button onClick={() => editingIdea && handleUpdateIdea(editingIdea)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to post dialog */}
      <Dialog open={!!convertingIdea} onOpenChange={() => setConvertingIdea(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Post</DialogTitle>
            <DialogDescription>
              This will create a draft post from your idea. You can edit it before publishing.
            </DialogDescription>
          </DialogHeader>
          {convertingIdea && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                <strong>{convertingIdea.title}</strong>
              </p>
              {convertingIdea.content && (
                <p className="text-sm text-muted-foreground mt-2">
                  {convertingIdea.content}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertingIdea(null)}>
              Cancel
            </Button>
            <Button onClick={confirmConvertIdea}>
              <Sparkle className="w-4 h-4 mr-2" weight="fill" />
              Convert to Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Place on calendar dialog */}
      <Dialog open={!!placingIdea} onOpenChange={() => setPlacingIdea(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place on Calendar</DialogTitle>
            <DialogDescription>
              Mark this idea as placed on your calendar. You can then schedule it from the calendar view.
            </DialogDescription>
          </DialogHeader>
          {placingIdea && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                <strong>{placingIdea.title}</strong>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlacingIdea(null)}>
              Cancel
            </Button>
            <Button onClick={confirmPlaceOnCalendar}>
              <Lightbulb className="w-4 h-4 mr-2" weight="fill" />
              Place on Calendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate ideas dialog */}
      <GenerateIdeasDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        onGenerate={handleGenerateIdeas}
      />
    </div>
  );
}
