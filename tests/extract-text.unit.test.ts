import { ComponentType } from "discord-api-types/v10";
import { describe, expect, it } from "vitest";
import { extractText } from "../src/index.js";

describe("extractText()", () => {
  it("reads classic content", () => {
    expect(extractText({ content: "🏓 Pong!" })).toBe("🏓 Pong!");
  });

  it("ignores empty content (Components V2 replies always have empty content)", () => {
    expect(extractText({ content: "" })).toBe("");
  });

  it("reads text display components from a container, in reading order", () => {
    const reply = {
      content: "",
      components: [
        {
          type: ComponentType.Container,
          components: [
            { type: ComponentType.TextDisplay, content: "🟢 All systems operational" },
            { type: ComponentType.Separator },
            { type: ComponentType.TextDisplay, content: "Uptime: 3 days" },
          ],
        },
      ],
    };

    expect(extractText(reply)).toBe("🟢 All systems operational\nUptime: 3 days");
  });

  it("also reads text display components from a section (container > section > text display)", () => {
    const reply = {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.Section,
              components: [{ type: ComponentType.TextDisplay, content: "Nested text" }],
              accessory: { type: ComponentType.Thumbnail, media: { url: "attachment://icon.png" } },
            },
          ],
        },
      ],
    };

    expect(extractText(reply)).toBe("Nested text");
  });

  it("ignores buttons/select menus in an action row (no content)", () => {
    const reply = {
      content: "Pick a color:",
      components: [
        {
          type: ComponentType.ActionRow,
          components: [{ type: ComponentType.Button, custom_id: "x", style: 1, label: "Click me" }],
        },
      ],
    };

    expect(extractText(reply)).toBe("Pick a color:");
  });
});
