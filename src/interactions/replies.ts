import { ComponentType, InteractionResponseType } from "discord-api-types/v10";
import type { CapturedRequest } from "../transport/rest-adapter.js";

/** Der Nachrichteninhalt einer Antwort – Rohform des Discord-Message-Payloads. */
export type ReplyContent = Record<string, unknown>;

const CALLBACK_URL = /\/interactions\/[^/]+\/[^/]+\/callback(?:\?|$)/;
const EDIT_ORIGINAL_URL = /\/webhooks\/[^/]+\/[^/]+\/messages\/(?:@|%40)original(?:\?|$)/;

/**
 * Liest den Antwort-Inhalt aus einem abgefangenen REST-Call, falls es einer
 * ist – `reply()`/`deferReply({ ... })` (POST `.../callback`, Typ
 * `ChannelMessageWithSource`) oder `editReply()` (PATCH
 * `.../messages/@original`). Ein reines `deferReply()` ohne Inhalt liefert
 * `undefined` – es ist noch keine sichtbare Antwort.
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
 * Rohform einer Message-Komponente – bewusst locker typisiert (`unknown`
 * statt eines konkreten `discord-api-types`-Unions), weil `extractText`
 * rekursiv über *jede* Komponenten-Art laufen muss (Container, Section,
 * ActionRow, TextDisplay, ...) und nur an `type`/`content`/`components`
 * interessiert ist – der Rest ist für diesen einen Zweck irrelevant.
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
 * Extrahiert den sichtbaren Text einer Antwort – funktioniert für
 * klassische `content`-Nachrichten genauso wie für Components-V2-Antworten
 * (`Container`/`Section`/`TextDisplay`, das `content`-Feld bleibt bei denen
 * leer). Reihenfolge: zuerst `content`, danach jedes `TextDisplay` in
 * Lesereihenfolge, rekursiv aus verschachtelten Containern/Sections geholt
 * – mehrere Textstücke durch `"\n"` getrennt.
 *
 * Buttons/Select-Menus in einer `ActionRow` innerhalb eines Containers
 * haben kein `content` und tauchen hier absichtlich nicht auf – dafür
 * `probe.button(...)`/`probe.selectMenu(...)` verwenden, die brauchen den
 * Text nicht.
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

/** Die Kerndaten eines per `interaction.showModal(...)` gezeigten Modals. */
export interface ModalContent {
  customId: string;
  title: string;
}

/**
 * Liest die Modal-Daten aus einem abgefangenen REST-Call, falls
 * `interaction.showModal(...)` ihn ausgelöst hat (POST `.../callback`, Typ
 * `Modal`). Sonst `undefined`.
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
