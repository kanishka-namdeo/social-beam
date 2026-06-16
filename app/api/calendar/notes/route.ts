import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createNoteSchema = z.object({
  date: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  blockScheduling: z.boolean().optional(),
  color: z.string().max(50).optional(),
});

const updateNoteSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  blockScheduling: z.boolean().optional(),
  color: z.string().max(50).optional(),
});

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = (session.user as any).workspaceId as string | undefined;
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth()), 10);

  const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  log.info("api.calendar.notes.get", { workspaceId, year, month });

  const notes = await prisma.calendarNote.findMany({
    where: {
      workspaceId,
      date: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({
    notes: notes.map((n) => ({
      id: n.id,
      date: n.date.toISOString(),
      title: n.title,
      description: n.description,
      blockScheduling: n.blockScheduling,
      color: n.color,
    })),
  });
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = (session.user as any).workspaceId as string | undefined;
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { date, title, description, blockScheduling, color } = parsed.data;

  log.info("api.calendar.notes.create", { workspaceId, title });

  const note = await prisma.calendarNote.create({
    data: {
      id: crypto.randomUUID(),
      workspaceId,
      date: new Date(date),
      title,
      description: description ?? null,
      blockScheduling: blockScheduling ?? false,
      color: color ?? null,
    },
  });

  return NextResponse.json({
    note: {
      id: note.id,
      date: note.date.toISOString(),
      title: note.title,
      description: note.description,
      blockScheduling: note.blockScheduling,
      color: note.color,
    },
  });
}

export async function PATCH(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = (session.user as any).workspaceId as string | undefined;
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id, ...updates } = parsed.data;

  const existing = await prisma.calendarNote.findUnique({
    where: { id },
    select: { workspaceId: true },
  });

  if (!existing || existing.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  log.info("api.calendar.notes.update", { workspaceId, noteId: id });

  const data: Record<string, unknown> = {};
  if (updates.title !== undefined) data.title = updates.title;
  if (updates.description !== undefined) data.description = updates.description;
  if (updates.blockScheduling !== undefined) data.blockScheduling = updates.blockScheduling;
  if (updates.color !== undefined) data.color = updates.color;

  const updated = await prisma.calendarNote.update({
    where: { id },
    data,
  });

  return NextResponse.json({
    note: {
      id: updated.id,
      date: updated.date.toISOString(),
      title: updated.title,
      description: updated.description,
      blockScheduling: updated.blockScheduling,
      color: updated.color,
    },
  });
}

export async function DELETE(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = (session.user as any).workspaceId as string | undefined;
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing note id" }, { status: 400 });
  }

  const existing = await prisma.calendarNote.findUnique({
    where: { id },
    select: { workspaceId: true },
  });

  if (!existing || existing.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  log.info("api.calendar.notes.delete", { workspaceId, noteId: id });

  await prisma.calendarNote.delete({ where: { id } });

  return NextResponse.json({ deleted: true });
}
