import { describe, expect, it, vi } from "vitest";
import { createFeedbackBot } from "../examples/feedback-bot/bot.js";
import { createProbe } from "../src/index.js";

/**
 * Reference example for buttons/select menus/modals/collectors in probe.ts:
 * injects component/modal interactions via the fluent API
 * (`probe.button(...)`/`probe.selectMenu(...)`/`probe.modal(...)`) and
 * checks that discord.js' `awaitMessageComponent()`/`awaitModalSubmit()`
 * (collectors) react to them. No network, no mocked discord.js models.
 */
describe("Message Components", () => {
  it("button → modal → submit: bot collects both via collectors", async () => {
    const probe = createProbe(createFeedbackBot());
    await probe.setup();

    await probe.slashCommand("feedback").invoke();
    expect(probe.lastReply()?.content).toBe("Click to give feedback:");

    await probe.button("open-feedback-modal").click();
    await vi.waitFor(() => {
      expect(probe.lastModal()).toBeDefined();
    });
    expect(probe.lastModal()).toMatchObject({ customId: "feedback-modal", title: "Your feedback" });

    await probe.modal("feedback-modal").withFields({ "feedback-text": "more coffee please" }).submit();
    expect(probe.lastReply()?.content).toBe('Thanks for your feedback: "more coffee please"');

    await probe.teardown();
  });

  it("selectMenu(): bot replies with the chosen value", async () => {
    const probe = createProbe(createFeedbackBot());
    await probe.setup();

    await probe.slashCommand("color").invoke();
    expect(probe.lastReply()?.content).toBe("Pick your favorite color:");

    await probe.selectMenu("color-select").withValues(["green"]).select();

    expect(probe.lastReply()?.content).toBe("You picked green.");

    await probe.teardown();
  });
});
