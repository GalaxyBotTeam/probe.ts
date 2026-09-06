import { describe, expect, it, vi } from "vitest";
import { createFeedbackBot } from "../examples/feedback-bot/bot.js";
import { createProbe } from "../src/index.js";

/**
 * Referenz-Beispiel für Buttons/Select-Menus/Modals/Collectors in probe.ts:
 * injiziert Component-/Modal-Interactions über die fluent API
 * (`probe.button(...)`/`probe.selectMenu(...)`/`probe.modal(...)`) und
 * prüft, dass discord.js' `awaitMessageComponent()`/`awaitModalSubmit()`
 * (Collectors) auf sie reagieren. Kein Netzwerk, keine gemockten
 * discord.js-Models.
 */
describe("Message Components", () => {
  it("Button → Modal → Submit: Bot sammelt beide über Collectors ein", async () => {
    const probe = createProbe(createFeedbackBot());
    await probe.setup();

    await probe.slashCommand("feedback").invoke();
    expect(probe.lastReply()?.content).toBe("Klick, um Feedback zu geben:");

    await probe.button("open-feedback-modal").click();
    await vi.waitFor(() => {
      expect(probe.lastModal()).toBeDefined();
    });
    expect(probe.lastModal()).toMatchObject({ customId: "feedback-modal", title: "Dein Feedback" });

    await probe.modal("feedback-modal").withFields({ "feedback-text": "mehr Kaffee bitte" }).submit();
    expect(probe.lastReply()?.content).toBe('Danke für dein Feedback: "mehr Kaffee bitte"');

    await probe.teardown();
  });

  it("selectMenu(): Bot antwortet mit dem gewählten Wert", async () => {
    const probe = createProbe(createFeedbackBot());
    await probe.setup();

    await probe.slashCommand("color").invoke();
    expect(probe.lastReply()?.content).toBe("Wähl deine Lieblingsfarbe:");

    await probe.selectMenu("color-select").withValues(["gruen"]).select();

    expect(probe.lastReply()?.content).toBe("Du hast gruen gewählt.");

    await probe.teardown();
  });
});
