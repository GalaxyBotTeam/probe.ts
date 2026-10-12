import { describe, expect, it, vi } from "vitest";
import { createReactionRoleBot } from "../examples/reaction-role-bot/bot.js";
import { createProbe } from "../src/index.js";

/**
 * Reference example for prefix commands + reactions in probe.ts: injects a
 * normal `messageCreate` with prefix content as well as
 * `messageReactionAdd`/`messageReactionRemove` via `probe.emit(...)` and
 * checks the REST responses. No network, no mocked discord.js models.
 */
describe("Prefix commands & reactions", () => {
  it("messageCreate with prefix: bot replies like to a classic prefix command", async () => {
    const probe = createProbe(createReactionRoleBot());
    await probe.setup();

    probe.emit("messageCreate", { content: "!roles" });

    await vi.waitFor(() => {
      expect(probe.capturedRequests()).toHaveLength(1);
    });
    const body = probe.capturedRequests()[0]?.body as { content?: string } | undefined;
    expect(body?.content).toBe("React with 🎮 to this message for the gamer role!");

    await probe.teardown();
  });

  it("messageReactionAdd: bot grants the role", async () => {
    const probe = createProbe(createReactionRoleBot());
    await probe.setup();

    probe.emit("messageReactionAdd", { emoji: "🎮", user: { username: "anna" } });

    await vi.waitFor(() => {
      expect(probe.capturedRequests()).toHaveLength(1);
    });
    const body = probe.capturedRequests()[0]?.body as { content?: string } | undefined;
    expect(body?.content).toContain("gamer role! 🎮");

    await probe.teardown();
  });

  it("messageReactionRemove: bot takes the role away again", async () => {
    const probe = createProbe(createReactionRoleBot());
    await probe.setup();

    // emit() internally seeds a preceding messageReactionAdd (see
    // src/events/gateway-event.ts), which the bot answers as well – so check
    // the *last* response here, not length 1.
    probe.emit("messageReactionRemove", { emoji: "🎮", user: { username: "anna" } });

    await vi.waitFor(() => {
      expect(probe.capturedRequests().length).toBeGreaterThanOrEqual(2);
    });
    const body = probe.capturedRequests().at(-1)?.body as { content?: string } | undefined;
    expect(body?.content).toContain("lost the gamer role again");

    await probe.teardown();
  });
});
