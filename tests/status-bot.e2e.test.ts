import { describe, expect, it } from "vitest";
import { createStatusBot } from "../examples/status-bot/bot.js";
import { createProbe, extractText } from "../src/index.js";

/**
 * Referenz-Beispiel für Components-V2-Container in probe.ts:
 * `/status` antwortet ohne `content`, nur mit einem `ContainerBuilder` –
 * `extractText()` macht den Text trotzdem sinnvoll prüfbar, ohne dass der
 * Test die Komponenten-Struktur selbst durchsuchen muss. Kein Netzwerk,
 * keine gemockten discord.js-Models.
 */
describe("Components V2", () => {
  it("/status: extractText() liest den Text aus dem Container", async () => {
    const probe = createProbe(createStatusBot());
    await probe.setup();

    await probe.slashCommand("status").invoke();

    const reply = probe.lastReply();
    expect(reply).toBeDefined();
    expect(extractText(reply!)).toBe("🟢 Alle Systeme laufen\nUptime: 3 Tage");

    await probe.teardown();
  });
});
