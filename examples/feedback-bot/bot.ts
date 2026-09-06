import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  GatewayIntentBits,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

/**
 * Beispiel-Bot für Message Components: `/feedback` zeigt einen Button, der
 * über `awaitMessageComponent()` (Channel-Collector) eingesammelt wird und
 * ein Modal öffnet; das Modal wird über `awaitModalSubmit()`
 * (Interaction-Collector) eingesammelt. `/color` zeigt ein
 * String-Select-Menu. Referenz-Beispiel für Buttons/Select-Menus/Modals/
 * Collectors in probe.ts.
 */
export function createFeedbackBot(): Client {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand() && interaction.commandName === "feedback") {
      const button = new ButtonBuilder()
        .setCustomId("open-feedback-modal")
        .setLabel("📝 Formular öffnen")
        .setStyle(ButtonStyle.Primary);
      await interaction.reply({
        content: "Klick, um Feedback zu geben:",
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)],
      });

      const buttonClick = await interaction.channel?.awaitMessageComponent({
        filter: (i) => i.customId === "open-feedback-modal" && i.user.id === interaction.user.id,
        time: 15_000,
      });
      if (!buttonClick) return;

      const modal = new ModalBuilder()
        .setCustomId("feedback-modal")
        .setTitle("Dein Feedback")
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("feedback-text")
              .setLabel("Was können wir besser machen?")
              .setStyle(TextInputStyle.Paragraph),
          ),
        );
      await buttonClick.showModal(modal);

      const submitted = await buttonClick.awaitModalSubmit({
        filter: (i) => i.customId === "feedback-modal",
        time: 15_000,
      });
      await submitted.reply(`Danke für dein Feedback: "${submitted.fields.getTextInputValue("feedback-text")}"`);
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "color") {
      const select = new StringSelectMenuBuilder()
        .setCustomId("color-select")
        .setPlaceholder("Wähl eine Farbe")
        .addOptions({ label: "Rot", value: "rot" }, { label: "Grün", value: "gruen" }, { label: "Blau", value: "blau" });
      await interaction.reply({
        content: "Wähl deine Lieblingsfarbe:",
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
      });
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "color-select") {
      await interaction.reply(`Du hast ${interaction.values[0]} gewählt.`);
    }
  });

  return client;
}
