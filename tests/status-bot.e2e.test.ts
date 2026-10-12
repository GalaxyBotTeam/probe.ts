import { describe, expect, it } from "vitest";
import { createStatusBot } from "../examples/status-bot/bot.js";
import { createProbe, extractText } from "../src/index.js";

/**
 * Reference example for Components V2 containers in probe.ts: `/status`
 * replies without `content`, only with a `ContainerBuilder` – `extractText()`
 * still makes the text checkable without the test walking the component
 * structure itself. No network, no mocked discord.js models.
 */
describe("Components V2", () => {
  it("/status: extractText() reads the text from the container", async () => {
    const probe = createProbe(createStatusBot());
    await probe.setup();

    await probe.slashCommand("status").invoke();

    const reply = probe.lastReply();
    expect(reply).toBeDefined();
    expect(extractText(reply!)).toBe("🟢 All systems operational\nUptime: 3 days");

    await probe.teardown();
  });
});
