# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal site is a project based on my professional experience created using my latest resume, the idea was to have a personal site where I can showcase myself and my experiences also to bind multiple side projects into this site so that it can be used as my portfolio and to learn different technologies while building this.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

No test suite is configured.

## Environment Variables

Required in `.env.local` for the contact form to work:

```
RESEND_API_KEY=...
CONTACT_EMAIL=...
```

## Architecture

Next.js 16 App Router personal portfolio site with Tailwind CSS v4, Framer Motion, and Resend for email.

**Pages** (`app/`):
- `/` — Hero + featured projects
- `/projects` — Full projects grid
- `/experience` — Timeline of work history
- `/contact` — Contact form

**Data layer** (`data/`): All content is static TypeScript files — `profile.ts`, `projects.ts`, `experience.ts`. To update site content, edit these files directly.

**Components** (`components/`):
- `components/ui/` — Reusable primitives: `Button`, `Card`, `Container`, `FadeIn`, `Input`, `Modal`, `Navbar`, `Section`, `Textarea`, `Timeline`
- `components/layout/` — `Footer`

**API** (`app/api/contact/route.ts`): POST handler for the contact form. Uses Resend to send emails. Includes in-memory IP rate limiting (5 req/min) and a honeypot field (`company`) for spam protection.

**Routing note**: `ProjectModal` lives inside `app/projects/` and is also imported on the homepage — it uses `@radix-ui/react-dialog` for the modal overlay.

## Path Aliases

`@/` maps to the project root (configured in `tsconfig.json`). Use `@/components/...`, `@/data/...`, etc.

---

## Roadmap

Features planned for this portfolio, in priority order.

### 0. Push to GitHub
- Create a new repository on GitHub (e.g. `talhahsn/personal-site`)
- Push the existing local repo: `git remote add origin <repo-url> && git push -u origin main`
- Keep `main` as the production branch

### 1. UI Polish & Dark Mode
- Add dark mode toggle using Tailwind's `dark:` variant
- Smooth page transitions between routes using Framer Motion `AnimatePresence`
- 3D tilt/depth hover effect on project cards using `framer-motion`
- More expressive scroll-triggered animations (expand on existing `FadeIn` component)

### 2. Resume Download
- Add a PDF download button on the `/experience` page
- Store the resume PDF in `public/` and link directly

### 3. Deploy to Vercel
- Connect the GitHub repo to [Vercel](https://vercel.com) (free tier, ideal for Next.js)
- Set environment variables (`RESEND_API_KEY`, `CONTACT_EMAIL`) in the Vercel dashboard
- Vercel auto-deploys on every push to `main` — all subsequent roadmap items ship live automatically

### 4. Case Studies (Expanded Projects)
- Expand project detail beyond a title + tech stack card
- Each project should tell a story: problem → approach → outcome
- Sourced from real work at Afiniti, Takaful Bazaar, Spekit etc.

### 5. Blog with In-Browser CMS
- Use **Keystatic CMS** for an `/admin` editor route — write and publish directly in the browser
- Content saved as MDX files committed to git (no separate DB or infra)
- Blog posts live under `app/blog/` with MDX rendering via `next-mdx-remote` or similar
- Topics: engineering leadership, frontend architecture, lessons from diverse domains

### 6. Skills Visualization
- Interactive tech radar or skill chart on the homepage or a dedicated `/skills` page
- Stack: React, Node.js, Next.js, NestJS, Angular, PostgreSQL, Docker, Apollo GraphQL etc.

### 7. AI Chatbot (Claude-powered)
- A chat widget that answers questions about experience, projects, and availability
- Backend: `app/api/chat/route.ts` using the Claude API (`@anthropic-ai/sdk`)
- On conversation end, email the transcript via Resend (already configured)
- WhatsApp delivery (via Twilio or Meta API) can be layered in later

### 8. Terminal Easter Egg
- Hidden `/terminal` route with a CLI-style interface
- Commands like `whoami`, `cat experience.txt`, `ls projects/` that return real data from `data/`
- Playful but professional — rewards curious visitors

### 9. "Open to Opportunities" Status
- Small green pulsing dot on the hero/navbar
- Tooltip with current availability status
- Controlled by a single boolean in `data/profile.ts`
