# WTAgent Master Blueprint — UI/UX Architecture

## Document: 12-ui-ux-architecture.md
## Status: **HISTORICAL** (archived 2024-01-15)

> **Note**: This document is a historical draft from the project's early design phase. The current release-readiness plan is in `.plan/task.md` (updated November 2026). See the `.plan` directory for the active plan, release criteria, and M0-M5 milestones.

## Document: DRAFT
## Version: 1.0
## Date: 2024-01-15

---

## UI/UX Architecture Overview

WTAgent uses Next.js 15 with App Router for a modern, responsive web interface. This document defines the UI architecture, component hierarchy, state management, and design system.

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | Next.js | 15.5.29 | App Router, Server Components |
| **UI Library** | React | 19.3.1 | Component framework |
| **Language** | TypeScript | 5.9.0 | Type safety |
| **Styling** | CSS Variables | Custom | Dark theme, consistent design |
| **State** | React useState/useEffect | Built-in | Local state management |
| **Routing** | Next.js App Router | Built-in | File-based routing |
| **Data Fetching** | fetch API | Native | REST API calls |
| **Real-time** | SSE | Native | Job status updates |

---

## Page Structure

| Route | File | Description |
|-------|------|-------------|
| `/` | `apps/web/src/app/page.tsx` | Workspace (chat interface) |
| `/workspace` | `apps/web/src/app/workspace/page.tsx` | Alias to home |
| `/jobs` | `apps/web/src/app/jobs/page.tsx` | Job list |
| `/jobs/[id]` | `apps/web/src/app/jobs/[id]/page.tsx` | Job detail |
| `/plugins` | `apps/web/src/app/plugins/page.tsx` | Plugin registry |
| `/providers` | `apps/web/src/app/providers/page.tsx` | Provider management |
| `/profile` | `apps/web/src/app/profile/page.tsx` | User profile |
| `/settings` | `apps/web/src/app/settings/page.tsx` | Settings |

---

## Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    App Shell (layout.tsx)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌─────────────────────────────────────────┐ │
│  │   Sidebar    │  │          Main Workspace                 │ │
│  │              │  │                                         │ │
│  │  - Brand     │  │  ┌─────────────────────────────────┐   │ │
│  │  - New Task  │  │  │     Conversation Panel          │   │ │
│  │  - Recent    │  │  │     (messages, task status)     │   │ │
│  │  - Jobs      │  │  └─────────────────────────────────┘   │ │
│  │  - Plugins   │  │                                         │ │
│  │  - Providers │  │  ┌─────────────────────────────────┐   │ │
│  │  - Profile   │  │  │     Inspector Panel             │   │ │
│  │  - Settings  │  │  │     (Preview, Files, Activity)  │   │ │
│  │              │  │  └─────────────────────────────────┘   │ │
│  │  - Footer    │  │                                         │ │
│  │    (API      │  │  ┌─────────────────────────────────┐   │ │
│  │     status)  │  │  │     Composer                    │   │ │
│  │              │  │  │     (textarea, send button)     │   │ │
│  └──────────────┘  └─────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Library

### Core Components

| Component | File | Description |
|-----------|------|-------------|
| `AppShell` | `page.tsx` | Main layout with sidebar |
| `Sidebar` | `page.tsx` | Navigation sidebar |
| `Conversation` | `page.tsx` | Chat/message interface |
| `Composer` | `page.tsx` | Task input form |
| `Inspector` | `page.tsx` | Side panel (tabs) |
| `MessageList` | `page.tsx` | Message display |
| `JobList` | `jobs/page.tsx` | Job table |
| `ProviderRow` | `providers/page.tsx` | Provider status row |
| `PluginRow` | `plugins/page.tsx` | Plugin toggle row |

### Reusable Components (Future)

| Component | Purpose | Status |
|-----------|---------|--------|
| `Button` | Standard button styles | Not extracted |
| `Input` | Form input styles | Not extracted |
| `Modal` | Approval dialogs | Not extracted |
| `Toast` | Notifications | Not extracted |
| `Spinner` | Loading indicator | Not extracted |
| `Badge` | Status badges | Not extracted |

---

## State Management

### Local State (useState)

```typescript
// Example from page.tsx
const [messages, setMessages] = useState<Message[]>(initialMessages);
const [prompt, setPrompt] = useState("");
const [provider, setProvider] = useState("ChatGPT");
const [providers, setProviders] = useState<WorkspaceProvider[]>([]);
const [recentJobs, setRecentJobs] = useState<JobRecord[]>([]);
const [activeTab, setActiveTab] = useState("Preview");
const [sidebarOpen, setSidebarOpen] = useState(true);
const [running, setRunning] = useState(false);
const [backendState, setBackendState] = useState<"checking" | "connected" | "offline">("checking");
```

### Server State (fetch + useEffect)

```typescript
// Fetch providers, profile, jobs on mount
useEffect(() => {
  void Promise.all([
    fetch(`${apiUrl}/v1/providers`).then(r => r.ok ? r.json() : []),
    fetch(`${apiUrl}/v1/profile`).then(r => r.ok ? r.json() : null),
    fetch(`${apiUrl}/v1/jobs`).then(r => r.ok ? r.json() : []),
  ]).then(([providerPayload, profilePayload, jobPayload]) => {
    setProviders(providerPayload as WorkspaceProvider[]);
    setRecentJobs((jobPayload as JobRecord[]).slice(0, 6));
    // ...
  });
}, []);
```

### Real-time Updates (Polling)

```typescript
// Poll job status every 3 seconds
useEffect(() => {
  const timer = window.setInterval(() => { void load(); }, 3000);
  return () => window.clearInterval(timer);
}, []);
```

---

## Design System

### Color Palette

```css
:root {
  color-scheme: dark;
  --canvas: #090b0d;
  --panel: #111418;
  --panel-raised: #171b20;
  --panel-soft: #0d1013;
  --line: #292f36;
  --line-soft: #20252b;
  --text: #f2f5f4;
  --muted: #9ba4a0;
  --subtle: #69716e;
  --accent: #8cf2c5;
  --accent-ink: #092018;
  --focus: #b7ffe0;
}
```

### Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Body | Segoe UI, Arial, sans-serif | 14px | 400 |
| Headings | Segoe UI, Arial, sans-serif | 22-30px | 700 |
| Code | Courier New, monospace | 12px | 400 |
| Labels | Segoe UI, Arial, sans-serif | 11px | 700 |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight spacing |
| `--space-2` | 8px | Component padding |
| `--space-3` | 12px | Section spacing |
| `--space-4` | 16px | Layout gaps |
| `--space-5` | 24px | Large sections |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Small elements |
| `--radius-md` | 6px | Buttons, inputs |
| `--radius-lg` | 9px | Cards, panels |

---

## Responsive Design

### Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | <760px | Sidebar overlay, stacked panels |
| Tablet | 760-980px | Sidebar overlay, 48/52 split |
| Desktop | >980px | Sidebar fixed, 44/56 split |

### Mobile Adaptations

- Sidebar becomes overlay (toggle with button)
- Conversation and inspector stack vertically
- Touch-friendly tap targets (44px minimum)
- Reduced padding for small screens

---

## Accessibility

### ARIA Labels

```html
<aside class="sidebar" aria-label="Workspace navigation">
<nav class="conversation" aria-label="Agent conversation">
<section class="inspector" aria-label="Workspace details">
<button class="icon-button" aria-label="Collapse sidebar">
```

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Navigate between interactive elements |
| `Enter` | Submit form, activate button |
| `Escape` | Close modal, cancel operation |
| `↑/↓` | Input history (multiline paste) |

### Focus States

```css
button:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}

a:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 3px;
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

---

## User Flows

### 1. New Task Flow

```
1. User opens workspace
2. Types task in composer
3. Selects provider (if multiple)
4. Clicks "Send task"
5. Job queued → status updates via SSE
6. Result displayed in conversation
```

### 2. Provider Login Flow

```
1. User navigates to Providers
2. Clicks "Connect" for provider
3. Chrome opens with login URL
4. User completes authentication
5. Returns to UI
6. Provider shows "Connected"
```

### 3. Job Detail Flow

```
1. User clicks job in list
2. Navigates to /jobs/[id]
3. Shows job details, logs, status
4. Can cancel (if running) or retry (if failed)
```

---

## Performance Optimizations

### Code Splitting
- Next.js automatic code splitting
- Lazy load heavy components (future)

### Caching
- React Query for server state (future)
- Browser cache for static assets

### Bundle Size
- Tree shaking (unused code elimination)
- Dynamic imports for large libraries

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | Architecture | Initial draft |