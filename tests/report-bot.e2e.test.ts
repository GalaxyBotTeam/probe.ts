import { RESTJSONErrorCodes } from "discord.js";
import { describe, expect, it } from "vitest";
import { createReportBot } from "../examples/report-bot/bot.js";
import { createProbe, DEFAULT_IDS, restError } from "../src/index.js";

/**
 * Reference example for context menu commands, DM interactions and Discord
 * errors: the report bot forwards reports to a moderators' channel and
 * handles a deleted channel like a real bot would.
 */
describe("Report bot", () => {
  it("Report message: forwards the message to the report channel", async () => {
    // the interaction's channel is seeded into the cache, so fetching it needs no REST call
    const probe = createProbe(createReportBot(DEFAULT_IDS.channel));
    await probe.setup();

    await probe.contextMenu("Report message").withContext({ user: { id: "7" } }).onMessage({ id: "99", content: "spam" });

    expect(probe.capturedRequests()[0]?.body).toMatchObject({ content: '🚩 <@7> reported message 99: "spam"' });
    expect(probe.lastReply()?.content).toBe("Thanks, the moderators will take a look.");
    await probe.teardown();
  });

  it("Report user: forwards the user to the report channel", async () => {
    const probe = createProbe(createReportBot(DEFAULT_IDS.channel));
    await probe.setup();

    await probe.contextMenu("Report user").onUser({ id: "42" });

    expect(probe.capturedRequests()[0]?.body).toMatchObject({ content: `🚩 <@${DEFAULT_IDS.user}> reported user <@42>` });
    await probe.teardown();
  });

  it("deleted report channel: Discord's Unknown Channel error becomes a hint for the user", async () => {
    const probe = createProbe(createReportBot("404"));
    probe.respond("GET", /\/channels\/404$/, () =>
      restError(404, { code: RESTJSONErrorCodes.UnknownChannel, message: "Unknown Channel" }),
    );
    await probe.setup();

    await probe.contextMenu("Report user").onUser({ id: "42" });

    expect(probe.lastReply()?.content).toBe("The report channel is gone – please tell an admin.");
    await probe.teardown();
  });

  it("in a DM: reports only work in a server", async () => {
    const probe = createProbe(createReportBot(DEFAULT_IDS.channel));
    await probe.setup();

    await probe.contextMenu("Report message").withContext({ dm: true }).onMessage({ content: "spam" });

    expect(probe.lastReply()?.content).toBe("Reports only work in a server.");
    expect(probe.capturedRequests()).toHaveLength(1);
    await probe.teardown();
  });
});
