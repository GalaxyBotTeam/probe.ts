import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/** One thing that crossed the fake transport layer, in the order it happened. */
export type TimelineEvent =
  /** A gateway event probe.ts injected into the client (incoming). */
  | { kind: "dispatch"; event: string; data: unknown }
  /** A REST call the bot made (outgoing) and what probe.ts answered. */
  | { kind: "request"; method: string; url: string; body: unknown; status: number; response: unknown };

/** A `TimelineEvent` with `at`: milliseconds since `createProbe()`. */
export type TimelineEntry = TimelineEvent & { at: number };

/** Records transport events with a relative timestamp – the trace behind `probe.timeline()`. */
export class Timeline {
  readonly entries: TimelineEntry[] = [];
  private readonly start = performance.now();

  record = (event: TimelineEvent): void => {
    this.entries.push({ at: Math.round((performance.now() - this.start) * 10) / 10, ...event });
  };

  /** Writes the entries as pretty-printed JSON, creating missing folders. */
  async export(filePath: string): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(this.entries, null, 2)}\n`);
  }
}
