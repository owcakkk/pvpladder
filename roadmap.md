# Ladder points
- [x] Apply HT3+ Ladder point values and rename point labels.
- [x] Store per-kit additional LP and add staff setter / defence adjustments.
- [x] Test score rules and verify saved adjustments in the rankings.
- [x] Replace fixed lower-tier awards with staff-entered per-kit LP and validate tier ranges.
- [x] Remove Information and verify saved per-kit LP in rankings.
- [x] Overall ladder: sort by LP with best-tier tie-break; order tier chips highest→lowest (LT3→LT5 for lower tiers).
- [x] Player profiles: clickable ranking rows open /players/:id with avatar, region, total LP and per-kit tier/LP cards.
- [x] Comparison view at /compare: pick two players (link from profiles) to compare tiers and LP across every kit.
- [ ] Full lower-tier skill categories and LP/CF split: awaiting category definitions.

# Tournaments
- [x] Tournaments page with round-robin standings (ratio = wins − losses, top 3 earn HT3).
- [x] Staff panel: tournament title, register up to 10 players, edit wins/losses, remove players.
- [x] Finish multiple tournaments: dropdown, overview/detail pages, staff create/switch/delete controls.
- [x] Verify independent rosters and saved tournament changes end to end.

# Minecraft usernames
- [ ] Record name changes atomically and add staff-only history with UUID, current tiers and LP.
- [ ] Test audit recording and access, and verify the staff review screen.
- [x] Add authenticated scheduled official UUID username checks, preserving player identity, tiers and LP.
- [x] Test identity preservation and failures, verify the callback, and activate the schedule (publish updated app for production delivery).
