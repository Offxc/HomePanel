// No middleware-level auth check. Every authed page calls `requireSession()`
// directly (see `src/app/(app)/layout.tsx`), which uses the database adapter
// in the Node runtime. Edge-runtime middleware can't carry the Prisma adapter,
// and middleware here would only duplicate the page-level guard.

export const config = { matcher: [] };
