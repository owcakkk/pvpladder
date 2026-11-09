# Discord bot tier sync

POST `https://pvpladder.lovable.app/api/public/sync-tier` after publishing this version.

This app uses a TanStack server endpoint, not a separately deployed Edge Function.

Set the same `SITE_SYNC_SECRET` in your bot and the site's secure secret form.
Send `Content-Type: application/json`, `x-sync-timestamp` (current Unix milliseconds), and
`x-sync-signature` (hex HMAC-SHA256 of `<timestamp>.<exact raw JSON body>`).
Serialize once, sign that exact string, and send it unchanged. Never send the secret itself.

Accepted events: `result`, `highresult`, and `snapshot` with up to 100 players per request.
Snapshot fields `batch` and `batches` must be nonnegative/positive integers respectively;
both zero-based and one-based batch labels are accepted. Each batch is atomic.

Kit IDs: sword, axe, mace, spearmace, uhc, smp, diasmp, diapot, nethop, bowcart, xbowcart.
Player fields: username, kit, kitName, tier, totalLp, categories, testedAt, discordId.
Optional fields: previousTier, previousLp, region, testerId, guildId.
High tiers may send null LP. Lower-tier LP must match existing site ranges.
Categories may be an object, array, or null. Timestamps use Unix milliseconds.

Successful events return `200 { "ok": true }`. Invalid signatures or timestamps outside
five minutes return 401. Bad payloads return 400, oversized bodies 413, temporary failures 503.
Retry 503 with a fresh request timestamp/signature. Stale or duplicate testedAt values
do not overwrite newer results. A snapshot only upserts; it never deletes missing players.

New players are looked up through the official Minecraft API before insertion;
failed lookups cause the whole request to fail safely for retry. Stable ladder IDs
and UUIDs remain attached to existing results. Discord IDs are stored privately,
not exposed through publicly readable tier rows. Staff manual tier changes clear
the previous bot display metadata so the staff-assigned result appears immediately.