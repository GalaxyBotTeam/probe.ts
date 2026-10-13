import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client, GatewayIntentBits } from "discord.js";
import { describe, expect, it } from "vitest";
import { createProbe } from "../src/index.js";

/** Reference example for `probe.timeline()`: gateway events in, REST calls out, in the order they happened. */
describe("timeline", () => {
  it("records injected dispatches and the bot's REST calls in order and exports them as JSON", async () => {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    client.on("interactionCreate", async (interaction) => {
      if (interaction.isChatInputCommand()) await interaction.reply("pong");
    });
    const probe = createProbe(client);
    await probe.setup();

    await probe.slashCommand("ping").invoke();

    const entries = probe.timeline();
    const interactionAt = entries.findIndex((entry) => entry.kind === "dispatch" && entry.event === "INTERACTION_CREATE");
    const callbackAt = entries.findIndex((entry) => entry.kind === "request" && entry.url.includes("/callback"));
    expect(entries[0]).toMatchObject({ kind: "dispatch", event: "READY" });
    expect(interactionAt).toBeGreaterThan(0);
    expect(callbackAt).toBeGreaterThan(interactionAt);
    expect(entries[callbackAt]).toMatchObject({ method: "POST", status: 204, response: null, body: { data: { content: "pong" } } });
    expect(entries.map((entry) => entry.at)).toEqual([...entries.map((entry) => entry.at)].sort((a, b) => a - b));

    const dir = await mkdtemp(join(tmpdir(), "probe-timeline-"));
    try {
      const file = join(dir, "nested", "ping.json");
      await probe.exportTimeline(file);
      expect(JSON.parse(await readFile(file, "utf8"))).toEqual(entries);
    } finally {
      await rm(dir, { recursive: true, force: true });
      await probe.teardown();
    }
  });
});
