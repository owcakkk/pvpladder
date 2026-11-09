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
- [ ] Discord bot: secure signed tier endpoint, additive result storage, ranking/profile display, tests and secret setup.
- [ ] Add kit selection and atomic LT3 roster synchronization with derank removal and a 10-player cap.
- [ ] Test eligibility changes and verify tournament controls.
- [x] Tournaments page with round-robin standings (ratio = wins − losses, top 3 earn HT3).
- [x] Staff panel: tournament title, register up to 10 players, edit wins/losses, remove players.
- [x] Finish multiple tournaments: dropdown, overview/detail pages, staff create/switch/delete controls.
- [x] Verify independent rosters and saved tournament changes end to end.

# Minecraft usernames
- [ ] Verify scheduled username updates from the live site after publishing; the official sessionserver blocks its requests.
- [x] Correct SmokeIsMe to the official _youngGoat name in place and add the official Minecraft Services name lookup.
- [x] Record name changes atomically and add staff-only history with UUID, current tiers and LP.
- [ ] Verify the staff review screen while logged in; the available test password is no longer current (audit recording and access tests pass).
- [x] Add authenticated scheduled official UUID username checks, preserving player identity, tiers and LP.
- [x] Test identity preservation and failures, verify the callback, and activate the schedule (publish updated app for production delivery).
