---
name: Supabase realtime-js throws on server-side createClient under Vite SSR
description: Why @supabase/supabase-js createClient() can throw a "Node.js WebSocket support" error server-side, and how to fix it
---

`@supabase/supabase-js`'s `createClient()` always constructs a `RealtimeClient` internally
(`SupabaseClient._initRealtimeClient`), even if realtime features are never used. That
constructor synchronously checks for a global `WebSocket` and throws immediately if none is
found — it does not wait until `.channel().subscribe()` is called.

**Why:** In a Vite/TanStack Start dev server's SSR module execution context, `globalThis.WebSocket`
can be undefined even though the outer process is Bun (which does have native WebSocket). The
realtime-js environment check then falls back to `process.versions.node` (Bun reports a Node-like
version for compat) and throws `"Node.js <ver> detected without native WebSocket support"` —
this happens at `createClient()` call time, not at actual socket connection time. This broke a
Gmail OAuth server function (`requireSupabaseAuth` middleware creating a per-request Supabase
client) with a cryptic, unrelated-looking error surfaced to the end user as a toast.

**How to apply:** For every Supabase client created in server-only code (server routes, server
functions, middleware), pass `realtime: { transport: ws }` (from the `ws` npm package) in the
`createClient` options — this satisfies the internal check even though realtime is never actually
used server-side. Do NOT add this to isomorphic/browser-shared client modules (e.g. a shared
`client.ts` also imported by client components) — importing `ws` there can break the browser
bundle; browsers already have native WebSocket so the issue doesn't occur there.
