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
- Tier edits go straight from the browser to the database; admin-only writes are enforced by `has_role` RLS, and the first account created becomes admin.
