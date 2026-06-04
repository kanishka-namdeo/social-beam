"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoleBadge } from "@/components/dashboard/role-badge";
import type { UserRole } from "@/lib/role-guard";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date;
}

export function AdminClient({ users }: { users: AdminUser[] }) {
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setLoadingUserId(userId);
    try {
      const res = await fetch('/api/admin/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? 'Failed to update role');
        return;
      }

      toast.success('Role updated successfully');
      window.location.reload();
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoadingUserId(null);
    }
  };

  return (
    <Card className="rounded-sm border-border">
      <CardHeader>
        <CardTitle className="text-base">Users ({users.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-mono text-sm">{user.email}</TableCell>
                <TableCell>{user.name ?? '—'}</TableCell>
                <TableCell>
                  <RoleBadge role={user.role as UserRole} />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Select
                    value={user.role}
                    onValueChange={(value) => handleRoleChange(user.id, value)}
                    disabled={loadingUserId === user.id}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FREE_USER">Free User</SelectItem>
                      <SelectItem value="PREMIUM_USER">Premium User</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {loadingUserId === user.id && (
                    <Spinner className="size-4 animate-spin ml-2 inline" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
