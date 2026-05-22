---
name: media-library-implementation
overview: Build a complete Media Library system with upload, Sharp processing, storage, and compose-form integration for SocialBeam
todos:
  - id: task-1
    content: Add MediaAsset Prisma model, run migration, generate client
    status: pending
  - id: task-2
    content: Create lib/media/constants.ts with platform dimension specs and file validation rules
    status: pending
  - id: task-3
    content: Create lib/media/storage.ts for filesystem storage with secure path generation
    status: pending
  - id: task-4
    content: Create lib/media/processing.ts with Sharp-based resize, crop, format conversion
    status: pending
  - id: task-5
    content: Create app/api/media/upload/route.ts (POST) for file upload + processing
    status: pending
  - id: task-6
    content: Create app/api/media/route.ts (GET, DELETE) for listing and deleting assets
    status: pending
  - id: task-7
    content: Create app/api/media/[id]/route.ts (GET, DELETE) for single asset operations
    status: pending
  - id: task-8
    content: Create components/media/media-library.tsx — main page component with grid/list views
    status: pending
  - id: task-9
    content: Create components/media/media-grid.tsx — responsive image grid with lazy loading
    status: pending
  - id: task-10
    content: Create components/media/media-card.tsx — individual asset card with actions
    status: pending
  - id: task-11
    content: Create components/media/upload-dialog.tsx — drag-and-drop upload modal
    status: pending
  - id: task-12
    content: Create components/media/media-picker.tsx — asset selector for compose form
    status: pending
  - id: task-13
    content: Create components/media/platform-dimension-hints.tsx — per-platform size guides
    status: pending
  - id: task-14
    content: Create app/(dashboard)/media/page.tsx — Media Library server page
    status: pending
  - id: task-15
    content: Wire Media Library into sidebar navigation (dashboard layout + sidebar-nav)
    status: pending
  - id: task-16
    content: Integrate media picker into compose form (replace placeholder media handling)
    status: pending
  - id: task-17
    content: Configure next.config.ts upload size limits and add uploads to .gitignore
    status: pending
  - id: task-18
    content: Run typecheck, lint, build — fix all issues
    status: pending
---

# Media Library Implementation Plan

## Overview

Build SocialBeam's Media Library — a complete media asset management system enabling users to upload, store, process, and select images for social media posts. This addresses the #1 gap identified from the Buffer user flow analysis: the compose form has media upload references but zero actual implementation.

**What gets built**:
- Database model for tracking media assets
- Upload API with Sharp v0.34.5 image processing (resize, crop, format conversion)
- Filesystem storage with secure path generation
- Media Library page with grid/list views, search, and filters
- Upload dialog with drag-and-drop and progress indication
- Media picker dialog for selecting assets during post composition
- Platform-specific dimension hints (Buffer-equivalent crop hints)
- Integration into the compose form and sidebar navigation

**Differentiation from Buffer**: Platform dimension hints show exactly how media will appear on each target platform before publishing, preventing the size-limit failures that 259 Buffer users voted on.

---

## Research Summary

**Sharp v0.34.5** (installed, not yet used):
- API: `sharp(buffer).resize(w, h, { fit, position }).jpeg({ quality }).toBuffer()`
- Supports: JPEG, PNG, WebP, AVIF, GIF (animated)
- Does NOT support: Video processing (image-only library)
- v0.34 breaking changes: `removeAlpha` stricter, `autoOrient` added, array join support
- Source: [Sharp docs](https://sharp.pixelplumbing.com/api) (2025-2026)

**Next.js 16 File Uploads**:
- Native Web API `File` object — no multer needed
- `request.formData()` → `formData.get('file') as File` → `file.arrayBuffer()` → `Buffer.from()`
- Server Actions default 1MB body limit — must configure `serverActions.bodySizeLimit` in `next.config.ts`
- Vercel hosting limits: 4.5MB (Hobby), 6MB (Pro) — route handlers follow these limits
- Source: [Next.js docs](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) (2025-2026)

**Platform Dimension Specs** (from feasibility analysis):
- Instagram: 1080x1080 (square), 1080x1350 (portrait), 1080x566 (landscape), Reels 1080x1920
- Facebook: 1200x630 (link), 1200x1200 (post), Cover 820x312
- X/Twitter: 1600x900 (header), 1200x675 (post), 400x400 (avatar)
- LinkedIn: 1200x627 (post), 1584x396 (cover), 300x300 (logo)
- TikTok: 1080x1920 (video), 1080x1080 (post image)
- Pinterest: 1000x1500 (pin 2:3), 1080x1920 (story pin)
- Source: [buffer-features-feasibility-2026.md](docs/competitor-analysis/buffer-features-feasibility-2026.md)

**Existing Codebase Patterns**:
- API routes: `app/api/[resource]/route.ts` with auth check → logger → Zod validation → Prisma → `{ data }` response
- Pages: Server Component `app/(dashboard)/[route]/page.tsx` fetches data, passes to client components
- Components: `'use client'` + shadcn/ui + Tailwind semantic tokens + Phosphor icons + `cn()` utility
- Navigation: Add to `navItems` array in `app/(dashboard)/layout.tsx` + icon key in `sidebar-nav.tsx`
- Storage: Sharp v0.34.5 already in `package.json` and `pnpm-lock.yaml` but zero source usage

---

## Security Considerations

**File Validation** (must be enforced server-side):
- MIME type validation: only `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/avif` accepted
- Magic bytes verification: check file signature, not just MIME type from client
- File size limit: 10MB per file (configurable)
- Filename sanitization: strip path components, allow only alphanumeric + hyphen + underscore + extension
- Path traversal prevention: never use user-provided filenames in storage paths

**Storage Security**:
- Store uploads outside `public/` directory — serve via dedicated API route or CDN
- Generate UUID-based filenames — never expose original filenames in URLs
- Add rate limiting consideration for upload endpoint (future enhancement)

**Sharp Security**:
- Sharp/libvips processes untrusted image data — ensure max dimension limits to prevent decompression bombs
- Set `failOnError: true` to reject corrupted files
- Limit output dimensions to 10000x10000 max

---

## Breaking Changes & Migrations

**Database Migration**:
- New `MediaAsset` model added to Prisma schema
- Run `npx prisma migrate dev --name add_media_assets` to create and apply migration
- No existing data affected (new table)
- Generated Prisma client will include new model

**Next.js Config**:
- Add `serverActions.bodySizeLimit: '10mb'` to `next.config.ts` for Server Action compatibility
- No breaking changes to existing routes

**Dependencies**:
- No new dependencies needed — Sharp v0.34.5 already installed
- `uuid` package may be needed for secure filename generation (check if already present)

---

## Implementation Approach

### Task 1: Database Schema

Add `MediaAsset` model to `prisma/schema.prisma`. The model tracks:
- Asset metadata (original filename, MIME type, file size, dimensions)
- Processed variants (per-platform resized versions stored as JSON)
- Tags for organization and search
- Workspace scoping for multi-tenant isolation
- Audit fields (created/updated)

### Task 2: Platform Dimension Constants

Define platform dimension specs as a single source of truth. Each platform entry includes:
- Post dimensions (width, height, aspect ratio)
- Story/reel dimensions
- Cover/header dimensions
- Max file size per platform API
- Recommended Sharp resize fit strategy

### Task 3: Storage Layer

Filesystem storage abstraction that:
- Generates UUID-based storage paths: `uploads/{workspaceId}/{year}/{month}/{uuid}.{ext}`
- Creates directories on-demand with `mkdir -p`
- Returns both the filesystem path and the public URL
- Supports deletion (unlink file + remove from DB)

### Task 4: Image Processing

Sharp-based processing pipeline:
1. Accept raw image buffer
2. Extract metadata (original dimensions, format)
3. Resize to standard post size (1200px max width)
4. Generate platform-specific variants on-demand
5. Convert to optimal format (WebP for web, JPEG for platform APIs)
6. Return processed buffers + metadata

### Task 5-7: API Routes

Follow established patterns:
- `POST /api/media/upload`: FormData → validate → process with Sharp → store → DB record → return asset
- `GET /api/media`: List workspace assets with pagination, search, and tag filters
- `DELETE /api/media/:id`: Delete asset (file + DB record) with orphan check

### Task 8-13: UI Components

All use shadcn/ui primitives:
- MediaLibrary: Full-width page with Tabs (Grid/List), search bar, upload button
- MediaGrid: Responsive grid (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6`) with lazy-loaded images
- MediaCard: Image thumbnail + filename + dimensions + action dropdown (delete, copy URL, use in post)
- UploadDialog: Modal with drag-and-drop zone, file list, progress bars, multi-file support
- MediaPicker: Dialog opened from compose form showing assets with multi-select checkboxes
- PlatformDimensionHints: Accordion showing recommended sizes per connected platform

### Task 14: Media Library Page

Server Component that:
- Authenticates user
- Fetches workspace assets server-side
- Passes data to client MediaLibrary component
- Follows full-width layout pattern (DESIGN.md §5.1)

### Task 15: Navigation Integration

Add `{ label: "Media Library", href: "/media", icon: "image" }` to `navItems` in dashboard layout.

### Task 16: Compose Form Integration

Add a "Media Library" button to the compose toolbar that opens the MediaPicker dialog. Selected assets populate the post's media array.

---

## File Changes

| File | Change | API/Pattern Used | Source |
|------|--------|-----------------|--------|
| `prisma/schema.prisma` | Add `MediaAsset` model with relations | Prisma model definition | Existing schema patterns |
| `lib/media/constants.ts` | New file: platform dimensions, MIME types, size limits | TypeScript const object | Buffer feasibility doc |
| `lib/media/storage.ts` | New file: filesystem storage with UUID paths | `fs/promises`, `path`, `crypto.randomUUID` | Next.js 16 patterns |
| `lib/media/processing.ts` | New file: Sharp image processing pipeline | `sharp` v0.34.5 | [Sharp API docs](https://sharp.pixelplumbing.com/api) |
| `app/api/media/upload/route.ts` | New file: POST upload endpoint | `request.formData()`, Sharp, Prisma, Zod | Existing API patterns |
| `app/api/media/route.ts` | New file: GET list, DELETE bulk | Prisma `findMany`, pagination | Existing API patterns |
| `app/api/media/[id]/route.ts` | New file: GET single, DELETE single | Prisma `findUnique`, `delete` | Existing API patterns |
| `components/media/media-library.tsx` | New file: main page component | shadcn Tabs, Input, Button | Design system |
| `components/media/media-grid.tsx` | New file: responsive grid layout | CSS Grid, `next/image` | Tailwind patterns |
| `components/media/media-card.tsx` | New file: asset card | shadcn Card, DropdownMenu | Design system |
| `components/media/upload-dialog.tsx` | New file: drag-and-drop upload | shadcn Dialog, Progress | Design system |
| `components/media/media-picker.tsx` | New file: asset selector dialog | shadcn Dialog, Checkbox, Badge | Design system |
| `components/media/platform-dimension-hints.tsx` | New file: platform size guides | shadcn Accordion, Table | Buffer feasibility doc |
| `app/(dashboard)/media/page.tsx` | New file: Media Library page | Server Component, auth, Prisma | Next.js 16 patterns |
| `app/(dashboard)/layout.tsx` | Add "Media Library" to navItems | NavItem interface | Existing nav pattern |
| `components/dashboard/sidebar-nav.tsx` | Add "image" icon mapping | Phosphor Icon map | `@phosphor-icons/react` |
| `components/compose/toolbar/toolbar.tsx` | Add media library button | shadcn Button, Tooltip | Design system |
| `components/compose/compose-form.tsx` | Wire media picker state | useState, MediaPicker | Existing compose patterns |
| `next.config.ts` | Add `serverActions.bodySizeLimit` | NextConfig | Next.js 16 docs |
| `.gitignore` | Add `/uploads/` directory | Git ignore | Standard practice |

---

## Verification Steps

- [ ] `pnpm run typecheck` (0 errors)
- [ ] `pnpm run lint` (0 warnings)
- [ ] `pnpm run build` (success)
- [ ] Prisma migration applies cleanly (`npx prisma migrate dev`)
- [ ] Upload API accepts valid image files and returns asset record
- [ ] Upload API rejects non-image files (400 error)
- [ ] Upload API rejects oversized files (413 error)
- [ ] Media Library page renders with grid view
- [ ] Upload dialog supports drag-and-drop
- [ ] Media picker opens from compose form and returns selected assets
- [ ] Platform dimension hints show correct sizes for connected platforms
- [ ] Delete API removes both file and database record
- [ ] Assets are workspace-scoped (no cross-workspace leakage)
- [ ] No hardcoded color values in any component
- [ ] All UI uses shadcn components (no raw HTML buttons/inputs)
- [ ] Dark mode works automatically (semantic tokens only)

---

## Execution Mode

| Task | Mode | Rationale |
|------|------|-----------|
| Task 1 (DB schema) | Direct | Single file change |
| Task 2 (constants) | Direct | Single new file, no dependencies |
| Task 3 (storage) | Direct | Single new file, utility module |
| Task 4 (processing) | Direct | Single new file, Sharp API usage |
| Tasks 5-7 (API routes) | Direct | 3 files, same layer, established patterns |
| Tasks 8-13 (UI components) | SUBAGENT | 6 files, crosses component boundaries, requires design-system adherence |
| Task 14 (page) | Direct | Single file, Server Component pattern |
| Task 15 (nav) | Direct | 2 small edits |
| Task 16 (compose integration) | Direct | 2 files, same layer |
| Task 17 (config) | Direct | 2 small edits |
| Task 18 (verification) | Direct | Command execution |

## Execution Order

1. **Task 1**: DB schema + migration (foundation)
2. **Task 2**: Platform dimension constants (needed by processing + UI)
3. **Task 3**: Storage layer (needed by upload API)
4. **Task 4**: Image processing (needed by upload API)
5. **Task 5**: Upload API route (depends on Tasks 3, 4)
6. **Task 6**: List/Bulk API routes (depends on Task 1)
7. **Task 7**: Single asset API routes (depends on Task 1)
8. **Tasks 8-13**: UI components (can be parallelized as subagents after Task 7)
9. **Task 14**: Media Library page (depends on Tasks 8-9)
10. **Task 15**: Navigation integration (depends on Task 14)
11. **Task 16**: Compose form integration (depends on Task 12)
12. **Task 17**: Config + gitignore (depends on Task 5)
13. **Task 18**: Full verification (final step)
