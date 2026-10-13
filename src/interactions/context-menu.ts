import type { APIUser, GatewayInteractionCreateDispatch } from "discord-api-types/v10";
import {
  buildMessageContextMenuInteractionDispatch,
  buildUserContextMenuInteractionDispatch,
} from "../fixtures/context-menu-interaction.js";
import type { InteractionContextOverrides } from "../fixtures/interaction-context.js";
import type { MessageOverrides } from "../fixtures/message.js";

/** Fluent builder for a context menu command, returned by `Probe.contextMenu()`. */
export interface ContextMenuInvocation {
  /** Sets who opens the menu where (user, member, guild, channel). Returns itself, for chaining. */
  withContext(context: InteractionContextOverrides): ContextMenuInvocation;
  /** Runs the menu as a user command on `target` and waits until the bot has responded at least once. */
  onUser(target?: Partial<APIUser>): Promise<void>;
  /** Runs the menu as a message command on `target` and waits until the bot has responded at least once. */
  onMessage(target?: MessageOverrides): Promise<void>;
}

/**
 * Builds a `ContextMenuInvocation`. Not part of the public API – only used
 * internally via `Probe.contextMenu()`.
 */
export function createContextMenuInvocation(
  name: string,
  inject: (dispatch: GatewayInteractionCreateDispatch) => void,
  waitForReply: () => Promise<void>,
): ContextMenuInvocation {
  let context: InteractionContextOverrides = {};

  const invocation: ContextMenuInvocation = {
    withContext(newContext) {
      context = newContext;
      return invocation;
    },
    async onUser(target) {
      inject(buildUserContextMenuInteractionDispatch(name, { ...context, ...(target ? { target } : {}) }));
      await waitForReply();
    },
    async onMessage(target) {
      inject(buildMessageContextMenuInteractionDispatch(name, { ...context, ...(target ? { target } : {}) }));
      await waitForReply();
    },
  };

  return invocation;
}
