import { describe, expect, it, vi } from "vitest";
import { createReactionRoleBot } from "../examples/reaction-role-bot/bot.js";
import { createProbe } from "../src/index.js";

/**
 * Referenz-Beispiel für Prefix-Commands + Reactions in probe.ts: injiziert
 * ein normales `messageCreate` mit Prefix-Inhalt sowie
 * `messageReactionAdd`/`messageReactionRemove` über `probe.emit(...)` und
 * prüft die REST-Antworten. Kein Netzwerk, keine gemockten discord.js-Models.
 */
describe("Prefix-Commands & Reactions", () => {
  it("messageCreate mit Prefix: Bot antwortet wie auf einen klassischen Prefix-Command", async () => {
    const probe = createProbe(createReactionRoleBot());
    await probe.setup();

    probe.emit("messageCreate", { content: "!rollen" });

    await vi.waitFor(() => {
      expect(probe.capturedRequests()).toHaveLength(1);
    });
    const body = probe.capturedRequests()[0]?.body as { content?: string } | undefined;
    expect(body?.content).toBe("Reagiere mit 🎮 auf diese Nachricht für die Gamer-Rolle!");

    await probe.teardown();
  });

  it("messageReactionAdd: Bot vergibt die Rolle", async () => {
    const probe = createProbe(createReactionRoleBot());
    await probe.setup();

    probe.emit("messageReactionAdd", { emoji: "🎮", user: { username: "anna" } });

    await vi.waitFor(() => {
      expect(probe.capturedRequests()).toHaveLength(1);
    });
    const body = probe.capturedRequests()[0]?.body as { content?: string } | undefined;
    expect(body?.content).toContain("Gamer-Rolle! 🎮");

    await probe.teardown();
  });

  it("messageReactionRemove: Bot entzieht die Rolle wieder", async () => {
    const probe = createProbe(createReactionRoleBot());
    await probe.setup();

    // emit() sät intern ein vorangestelltes messageReactionAdd (siehe
    // src/events/gateway-event.ts), das der Bot ebenfalls beantwortet –
    // deshalb hier auf die *letzte* Antwort prüfen, nicht auf Länge 1.
    probe.emit("messageReactionRemove", { emoji: "🎮", user: { username: "anna" } });

    await vi.waitFor(() => {
      expect(probe.capturedRequests().length).toBeGreaterThanOrEqual(2);
    });
    const body = probe.capturedRequests().at(-1)?.body as { content?: string } | undefined;
    expect(body?.content).toContain("wieder verloren");

    await probe.teardown();
  });
});
