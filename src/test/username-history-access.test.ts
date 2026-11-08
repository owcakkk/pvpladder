import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: { staff: false, v: 2 }, from: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => ({
  inputValidator() { return this; },
  handler(fn: (...args: unknown[]) => unknown) { return fn; },
}) }));
vi.mock("@tanstack/react-start/server", () => ({ useSession: async () => ({ data: mocks.session }) }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from } }));
import { recentUsernameChanges } from "@/lib/staff.functions";

describe("staff-only username history", () => {
  beforeEach(() => {
    mocks.session = { staff: false, v: 2 };
    mocks.from.mockReset().mockImplementation((table: string) => table === "staff_settings"
      ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { version: 2 } }) }) }) }
      : { select: () => ({ order: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }) }) });
  });
  it("rejects signed-out callers without reading history", async () => {
    await expect(recentUsernameChanges()).rejects.toThrow("Staff password required");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects staff sessions invalidated by password reset", async () => {
    mocks.session = { staff: true, v: 1 };
    await expect(recentUsernameChanges()).rejects.toThrow("Staff password required");
    expect(mocks.from).not.toHaveBeenCalledWith("minecraft_username_changes");
  });
  it("allows the current staff session to read history", async () => {
    mocks.session = { staff: true, v: 2 };
    expect(await recentUsernameChanges()).toEqual([]);
    expect(mocks.from).toHaveBeenCalledWith("minecraft_username_changes");
  });
});