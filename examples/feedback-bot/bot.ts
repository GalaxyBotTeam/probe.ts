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
 * Example bot for message components: `/feedback` shows a button that is
 * collected via `awaitMessageComponent()` (channel collector) and opens a
 * modal; the modal is collected via `awaitModalSubmit()` (interaction
 * collector). `/color` shows a string select menu. Reference example for
 * buttons/select menus/modals/collectors in probe.ts.
 */
export function createFeedbackBot(): Client {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand() && interaction.commandName === "feedback") {
      const button = new ButtonBuilder()
        .setCustomId("open-feedback-modal")
        .setLabel("📝 Open form")
        .setStyle(ButtonStyle.Primary);
      await interaction.reply({
        content: "Click to give feedback:",
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)],
      });

      const buttonClick = await interaction.channel?.awaitMessageComponent({
        filter: (i) => i.customId === "open-feedback-modal" && i.user.id === interaction.user.id,
        time: 15_000,
      });
      if (!buttonClick) return;

      const modal = new ModalBuilder()
        .setCustomId("feedback-modal")
        .setTitle("Your feedback")
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("feedback-text")
              .setLabel("What can we do better?")
              .setStyle(TextInputStyle.Paragraph),
          ),
        );
      await buttonClick.showModal(modal);

      const submitted = await buttonClick.awaitModalSubmit({
        filter: (i) => i.customId === "feedback-modal",
        time: 15_000,
      });
      await submitted.reply(`Thanks for your feedback: "${submitted.fields.getTextInputValue("feedback-text")}"`);
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "color") {
      const select = new StringSelectMenuBuilder()
        .setCustomId("color-select")
        .setPlaceholder("Pick a color")
        .addOptions({ label: "Red", value: "red" }, { label: "Green", value: "green" }, { label: "Blue", value: "blue" });
      await interaction.reply({
        content: "Pick your favorite color:",
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
      });
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "color-select") {
      await interaction.reply(`You picked ${interaction.values[0]}.`);
    }
  });

  return client;
}
