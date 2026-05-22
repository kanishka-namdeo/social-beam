# SocialBeam

AI-native social media management platform with an onboarding agent that guides users through connecting accounts, analyzing their brand voice, and generating content.

## Getting Started

First, run the development server:

```bash
pnpm install
pnpm db:migrate  # or: npx prisma migrate dev
pnpm db:seed     # creates a demo user for testing
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Demo Credentials

After running `pnpm db:seed`, you can log in with:

| Field    | Value                  |
|----------|------------------------|
| Email    | `demo@socialbeam.dev`  |
| Password | `demo1234!`            |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm lint` | ESLint |
| `pnpm db:seed` | Create demo user for testing |

## Project Structure

```
app/
  (auth)/          # Auth routes (login, register, onboarding)
  (dashboard)/     # Dashboard routes
  api/             # API routes (auth, onboarding)
lib/
  agent/           # LangGraph onboarding agent
  oauth/           # OAuth2 integrations (6 platforms)
  db/              # Database helpers
  auth.ts          # NextAuth configuration
prisma/
  schema.prisma    # Database schema
  seed.ts          # Demo user seeder
```
