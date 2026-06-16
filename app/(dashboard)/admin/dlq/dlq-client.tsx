'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, RefreshCw, Trash2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface DLQEntry {
  id: string;
  entityType: string;
  entityId: string;
  error: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown> | null;
}

interface DLQSummary {
  total: number;
  byEntityType: Record<string, number>;
  exhausted: number;
  retriable: number;
}

export function DLQClient() {
  const [entries, setEntries] = useState<DLQEntry[]>([]);
  const [summary, setSummary] = useState<DLQSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (entityType !== 'all') params.set('entityType', entityType);
      if (status !== 'all') params.set('status', status);

      const [entriesRes, summaryRes] = await Promise.all([
        fetch(`/api/admin/dlq?${params.toString()}`),
        fetch('/api/admin/dlq?action=summary'),
      ]);

      if (entriesRes.ok) {
        const data = await entriesRes.json();
        setEntries(data.entries || []);
      }

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }
    } catch (err) {
      toast.error('Failed to load DLQ entries');
    } finally {
      setLoading(false);
    }
  }, [entityType, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRetry = async (id: string) => {
    try {
      const res = await fetch('/api/admin/dlq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry', id }),
      });
      if (res.ok) {
        toast.success('Retry scheduled');
        fetchData();
      } else {
        toast.error('Failed to schedule retry');
      }
    } catch {
      toast.error('Failed to schedule retry');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const res = await fetch('/api/admin/dlq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', id }),
      });
      if (res.ok) {
        toast.success('Entry removed');
        fetchData();
      } else {
        toast.error('Failed to remove entry');
      }
    } catch {
      toast.error('Failed to remove entry');
    }
  };

  const handlePurge = async () => {
    if (!confirm('Remove all DLQ entries older than 30 days?')) return;
    try {
      const res = await fetch('/api/admin/dlq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purge', daysOld: 30 }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Purged ${data.purged} old entries`);
        fetchData();
      }
    } catch {
      toast.error('Failed to purge entries');
    }
  };

  const isExhausted = (entry: DLQEntry) => entry.retryCount >= entry.maxRetries;

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading DLQ entries...</div>;
  }

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Retriable</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{summary.retriable}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Exhausted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{summary.exhausted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">By Type</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {Object.entries(summary.byEntityType).map(([type, count]) => (
                <div key={type} className="flex justify-between">
                  <span>{type}</span>
                  <span className="font-mono">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-4">
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="post">Post</SelectItem>
            <SelectItem value="sync">Sync</SelectItem>
            <SelectItem value="token_refresh">Token Refresh</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Retriable</SelectItem>
            <SelectItem value="exhausted">Exhausted</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>

        <Button variant="outline" size="sm" onClick={handlePurge} className="ml-auto">
          <Trash2 className="mr-2 h-4 w-4" />
          Purge Old
        </Button>
      </div>

      <Separator />

      {entries.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-success" />
          <p className="text-lg font-medium">Dead letter queue is empty</p>
          <p className="text-sm">All operations are processing normally.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Entity ID</TableHead>
              <TableHead>Error</TableHead>
              <TableHead>Retries</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <Badge variant="outline">{entry.entityType}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{entry.entityId}</TableCell>
                <TableCell className="max-w-[300px] truncate" title={entry.error}>
                  <span className="text-destructive">{entry.error.slice(0, 80)}{entry.error.length > 80 ? '...' : ''}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={isExhausted(entry) ? 'destructive' : 'secondary'}>
                    {entry.retryCount}/{entry.maxRetries}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {!isExhausted(entry) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRetry(entry.id)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
