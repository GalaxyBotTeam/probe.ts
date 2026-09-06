import { ComponentType } from "discord-api-types/v10";
import { describe, expect, it } from "vitest";
import { extractText } from "../src/index.js";

describe("extractText()", () => {
  it("liest klassisches content", () => {
    expect(extractText({ content: "🏓 Pong!" })).toBe("🏓 Pong!");
  });

  it("ignoriert leeres content (Components-V2-Antworten haben immer leeres content)", () => {
    expect(extractText({ content: "" })).toBe("");
  });

  it("liest TextDisplay-Komponenten aus einem Container, in Lesereihenfolge", () => {
    const reply = {
      content: "",
      components: [
        {
          type: ComponentType.Container,
          components: [
            { type: ComponentType.TextDisplay, content: "🟢 Alle Systeme laufen" },
            { type: ComponentType.Separator },
            { type: ComponentType.TextDisplay, content: "Uptime: 3 Tage" },
          ],
        },
      ],
    };

    expect(extractText(reply)).toBe("🟢 Alle Systeme laufen\nUptime: 3 Tage");
  });

  it("liest TextDisplay-Komponenten auch aus einer Section (Container > Section > TextDisplay)", () => {
    const reply = {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.Section,
              components: [{ type: ComponentType.TextDisplay, content: "Verschachtelter Text" }],
              accessory: { type: ComponentType.Thumbnail, media: { url: "attachment://icon.png" } },
            },
          ],
        },
      ],
    };

    expect(extractText(reply)).toBe("Verschachtelter Text");
  });

  it("ignoriert Buttons/Select-Menus in einer ActionRow (kein content)", () => {
    const reply = {
      content: "Wähl eine Farbe:",
      components: [
        {
          type: ComponentType.ActionRow,
          components: [{ type: ComponentType.Button, custom_id: "x", style: 1, label: "Klick mich" }],
        },
      ],
    };

    expect(extractText(reply)).toBe("Wähl eine Farbe:");
  });
});
