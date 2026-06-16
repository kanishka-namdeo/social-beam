"use client";

import { useEffect, useState } from "react";
import { Copy, PencilSimple, NotePencil, Trash } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { notifySuccessWithCategory, notifyErrorWithCategory } from "@/lib/notifications";

interface Template {
  id: string;
  name: string;
  category: string;
  content: any;
  platforms: string[];
  usageCount: number;
  createdAt: string;
}

export function TemplateLibrary() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editForm, setEditForm] = useState({ name: "", category: "" });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      notifyErrorWithCategory("Failed to load templates", { category: "system" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: Template) => {
    setSelectedTemplate(template);
    setEditForm({ name: template.name, category: template.category });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedTemplate) return;

    try {
      const res = await fetch(`/api/templates?id=${selectedTemplate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          category: editForm.category,
        }),
      });

      if (res.ok) {
        notifySuccessWithCategory("Template updated", { category: "system" });
        setEditDialogOpen(false);
        fetchTemplates();
      } else {
        throw new Error("Failed to update template");
      }
    } catch (error) {
      console.error("Failed to update template:", error);
      notifyErrorWithCategory("Failed to update template", { category: "system" });
    }
  };

  const handleDuplicate = async (template: Template) => {
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          category: template.category,
          content: template.content,
          platforms: template.platforms,
        }),
      });

      if (res.ok) {
        notifySuccessWithCategory("Template duplicated", { category: "system" });
        fetchTemplates();
      } else {
        throw new Error("Failed to duplicate template");
      }
    } catch (error) {
      console.error("Failed to duplicate template:", error);
      notifyErrorWithCategory("Failed to duplicate template", { category: "system" });
    }
  };

  const handleDelete = (template: Template) => {
    setSelectedTemplate(template);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedTemplate) return;

    try {
      const res = await fetch(`/api/templates?id=${selectedTemplate.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        notifySuccessWithCategory("Template deleted", { category: "system" });
        setDeleteDialogOpen(false);
        setSelectedTemplate(null);
        fetchTemplates();
      } else {
        throw new Error("Failed to delete template");
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
      notifyErrorWithCategory("Failed to delete template", { category: "system" });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <NotePencil className="mx-auto mb-4 size-16 text-muted-foreground/50" weight="thin" />
        <h3 className="text-lg font-semibold text-foreground">No templates yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Create templates from the compose page to reuse content across posts
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Platforms</TableHead>
              <TableHead className="text-right">Usage</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">{template.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{template.category}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {template.platforms.length > 0 ? (
                      template.platforms.map((platform) => (
                        <Badge key={platform} variant="outline" className="text-xs">
                          {platform}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm text-muted-foreground">{template.usageCount}</span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(template)}
                      aria-label="Edit template"
                    >
                      <PencilSimple className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDuplicate(template)}
                      aria-label="Duplicate template"
                    >
                      <Copy className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(template)}
                      aria-label="Delete template"
                    >
                      <Trash className="size-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>Update the template name and category</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Input
                id="edit-category"
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete template?"
        description="This action cannot be undone. The template will be permanently removed."
        onConfirm={confirmDelete}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </>
  );
}
