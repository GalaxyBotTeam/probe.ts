import { ComponentType, InteractionResponseType } from "discord-api-types/v10";
import type { CapturedRequest } from "../transport/rest-adapter.js";

/** The message content of a reply – raw form of the Discord message payload. */
export type ReplyContent = Record<string, unknown>;

const CALLBACK_URL = /\/interactions\/[^/]+\/[^/]+\/callback(?:\?|$)/;
const EDIT_ORIGINAL_URL = /\/webhooks\/[^/]+\/[^/]+\/messages\/(?:@|%40)original(?:\?|$)/;

/**
 * Reads the reply content from a captured REST call, if it is one –
 * `reply()`/`deferReply({ ... })` (POST `.../callback`, type
 * `ChannelMessageWithSource`) or `editReply()` (PATCH
 * `.../messages/@original`). A plain `deferReply()` without content returns
 * `undefined` – it isn't a visible reply yet.
 */
export function parseReply(request: CapturedRequest): ReplyContent | undefined {
  if (CALLBACK_URL.test(request.url)) {
    const body = request.body as { type?: number; data?: ReplyContent } | null;
    if (body?.type === InteractionResponseType.ChannelMessageWithSource) {
      return body.data ?? {};
    }
    return undefined;
  }
  if (EDIT_ORIGINAL_URL.test(request.url) && request.method === "PATCH") {
    return (request.body as ReplyContent | null) ?? {};
  }
  return undefined;
}

/**
 * Raw form of a message component – deliberately loosely typed (`unknown`
 * instead of a concrete `discord-api-types` union), because `extractText`
 * has to walk *every* component kind recursively (container, section,
 * action row, text display, ...) and only cares about
 * `type`/`content`/`components` – the rest is irrelevant for this purpose.
 */
interface RawComponent {
  type?: number;
  content?: unknown;
  components?: unknown;
}

function collectText(component: unknown, into: string[]): void {
  if (typeof component !== "object" || component === null) {
    return;
  }
  const raw = component as RawComponent;
  if (raw.type === ComponentType.TextDisplay && typeof raw.content === "string") {
    into.push(raw.content);
    return;
  }
  if (Array.isArray(raw.components)) {
    for (const child of raw.components) {
      collectText(child, into);
    }
  }
}

/**
 * Extracts the visible text of a reply – works for classic `content`
 * messages just as well as for Components V2 replies
 * (`Container`/`Section`/`TextDisplay`, where the `content` field stays
 * empty). Order: `content` first, then every `TextDisplay` in reading order,
 * collected recursively from nested containers/sections – multiple text
 * pieces joined with `"\n"`.
 *
 * Buttons/select menus in an `ActionRow` inside a container have no
 * `content` and deliberately don't show up here – use
 * `probe.button(...)`/`probe.selectMenu(...)` for those, they don't need the
 * text.
 */
export function extractText(reply: ReplyContent): string {
  const parts: string[] = [];

  if (typeof reply.content === "string" && reply.content !== "") {
    parts.push(reply.content);
  }
  if (Array.isArray(reply.components)) {
    for (const component of reply.components) {
      collectText(component, parts);
    }
  }

  return parts.join("\n");
}

/** The core data of a modal shown via `interaction.showModal(...)`. */
export interface ModalContent {
  customId: string;
  title: string;
}

/**
 * Reads the modal data from a captured REST call, if
 * `interaction.showModal(...)` triggered it (POST `.../callback`, type
 * `Modal`). Otherwise `undefined`.
 */
export function parseModal(request: CapturedRequest): ModalContent | undefined {
  if (!CALLBACK_URL.test(request.url)) {
    return undefined;
  }
  const body = request.body as { type?: number; data?: { custom_id?: string; title?: string } } | null;
  if (body?.type !== InteractionResponseType.Modal || body.data?.custom_id === undefined || body.data.title === undefined) {
    return undefined;
  }
  return { customId: body.data.custom_id, title: body.data.title };
}
