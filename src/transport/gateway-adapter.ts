import { Collection } from "@discordjs/collection";
import {
  type IShardingStrategy,
  type WebSocketManager,
  type WebSocketShardDestroyOptions,
  WebSocketShardEvents,
  WebSocketShardStatus,
} from "@discordjs/ws";
import {
  GatewayDispatchEvents,
  GatewayOpcodes,
  type GatewayDispatchPayload,
  type GatewayReadyDispatchData,
  type GatewaySendPayload,
} from "discord-api-types/v10";
import type { TimelineEvent } from "../core/timeline.js";

/**
 * Fake `IShardingStrategy` – replaces `@discordjs/ws`'s real sharding layer.
 *
 * Instead of opening sockets, the adapter only holds a reference to the
 * `WebSocketManager` that discord.js constructs itself (passed via
 * `client.options.ws.buildStrategy`), and emits gateway events directly on
 * that manager – exactly what `SimpleShardingStrategy` does internally too
 * (see spike report). discord.js then processes the events through its real
 * `handlePacket`/actions path and builds real model objects.
 *
 * Not part of the public probe.ts API – only used internally via
 * `createProbe`.
 */
export class GatewayAdapter implements IShardingStrategy {
  /** Outgoing gateway payloads (heartbeat, identify, ...) the bot wanted to "send". */
  readonly sentPayloads: { shardId: number; payload: GatewaySendPayload }[] = [];

  constructor(
    private readonly manager: WebSocketManager,
    private readonly record: (event: TimelineEvent) => void,
  ) {}

  connect(): void {
    // no-op: no real socket to open
  }

  destroy(_options?: Omit<WebSocketShardDestroyOptions, "recover">): void {
    // no-op
  }

  spawn(_shardIds: number[]): void {
    // no-op: shards only exist virtually
  }

  send(shardId: number, payload: GatewaySendPayload): void {
    this.sentPayloads.push({ shardId, payload });
  }

  fetchStatus(): Collection<number, WebSocketShardStatus> {
    return new Collection([[0, WebSocketShardStatus.Ready]]);
  }

  /**
   * Brings shard 0 up into the `Ready` state. Needs two events (see spike
   * report): `Ready` (sets `expectedGuilds`) + `Dispatch{t:'READY'}` (fills
   * `client.user`/`client.guilds`, triggers `checkReady()`).
   *
   * `guilds: []` in the READY payload makes discord.js report "AllReady"
   * right away, without waiting for `GUILD_CREATE` fixtures.
   */
  injectReady(data: GatewayReadyDispatchData): void {
    this.manager.emit(WebSocketShardEvents.Ready, { data, shardId: 0 });
    this.injectDispatch({ t: GatewayDispatchEvents.Ready, op: GatewayOpcodes.Dispatch, s: 1, d: data });
  }

  /** Injects a raw gateway dispatch event (e.g. `INTERACTION_CREATE`). */
  injectDispatch(payload: GatewayDispatchPayload): void {
    this.record({ kind: "dispatch", event: payload.t, data: payload.d });
    this.manager.emit(WebSocketShardEvents.Dispatch, { data: payload, shardId: 0 });
  }
}
