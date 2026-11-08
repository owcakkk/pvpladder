<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Kit list, tier points and title thresholds live in `src/lib/kits.ts`; change them there only so rankings and admin stay in sync.
- Staff access is a shared password (STAFF_PASSWORD) stored in an encrypted session cookie; all ladder writes go through server functions in `src/lib/staff.functions.ts` that check that session, since the browser has no write access.
- Scheduled username-only updates use the managed cron-authenticated Minecraft refresh route and official UUID lookups; update existing player rows in place, never merge accounts or change IDs/scores, to preserve identity when names change. The oldest-first bounded queue retries failures and preserves conflicting names.
- Username audit history is recorded atomically by database triggers on same-UUID renames and read only through the staff-session-gated server function; the staff view joins current ladder tiers/LP by stable identity, never by username.
- Staff management uses separate Tier Assign and Tournaments tabs; keep both panels mounted so switching tabs preserves unsaved inputs.
- Additional Ladder points belong to the assigned player-kit tier row; total and kit scores use shared scoring helpers in `src/lib/kits.ts`, and defence adjustments use a service-role-only atomic database function to avoid lost concurrent updates.
- Tournaments: multiple independent tournaments in `public.tournaments`, each with a roster in `public.tournament_players` (max 10 per tournament); reads are public via `src/lib/tournaments.ts`, writes go through staff-password server functions in `src/lib/tournaments.functions.ts`. Query keys and writes include the selected tournament ID to keep rosters separate. `/tournaments` is an Outlet layout with overview and detail leaves; staff management lives in TournamentManager. Standings sort by wins − losses; top 3 display an HT3 reward badge (display only, no ladder tier is written).
- Tournament kit selection and tier writes synchronize auto-rosters through database triggers linked by ladder player ID; serialize roster/kit/tier/identity writes with a transaction advisory lock and enforce capacity in the database to prevent concurrent overflow. Retain promoted entrants and their records, remove deranked entrants, leave manual rows alone, and fill vacancies oldest eligible tier assignment first.
