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

/**
 * Fake `IShardingStrategy` – ersetzt `@discordjs/ws`'s echten Sharding-Layer.
 *
 * Statt Sockets zu öffnen, hält der Adapter nur eine Referenz auf den
 * `WebSocketManager`, den discord.js selbst konstruiert (übergeben via
 * `client.options.ws.buildStrategy`), und emittiert Gateway-Events direkt
 * auf diesem Manager – exakt das, was `SimpleShardingStrategy` intern auch
 * tut (siehe Spike-Report). discord.js verarbeitet die Events dann über
 * seinen echten `handlePacket`/Actions-Pfad und baut echte Model-Objekte.
 *
 * Nicht Teil der öffentlichen probe.ts-API – nur intern via `createProbe`
 * verwendet.
 */
export class GatewayAdapter implements IShardingStrategy {
  /** Ausgehende Gateway-Payloads (Heartbeat, Identify, ...), die der Bot "senden" wollte. */
  readonly sentPayloads: { shardId: number; payload: GatewaySendPayload }[] = [];

  constructor(private readonly manager: WebSocketManager) {}

  connect(): void {
    // no-op: kein echter Socket zu öffnen
  }

  destroy(_options?: Omit<WebSocketShardDestroyOptions, "recover">): void {
    // no-op
  }

  spawn(_shardIds: number[]): void {
    // no-op: Shards existieren nur virtuell
  }

  send(shardId: number, payload: GatewaySendPayload): void {
    this.sentPayloads.push({ shardId, payload });
  }

  fetchStatus(): Collection<number, WebSocketShardStatus> {
    return new Collection([[0, WebSocketShardStatus.Ready]]);
  }

  /**
   * Fährt Shard 0 in den `Ready`-Zustand hoch. Zwei Events nötig (siehe
   * Spike-Report): `Ready` (setzt `expectedGuilds`) + `Dispatch{t:'READY'}`
   * (füllt `client.user`/`client.guilds`, triggert `checkReady()`).
   *
   * `guilds: []` im READY-Payload sorgt dafür, dass discord.js sofort
   * "AllReady" meldet, ohne auf `GUILD_CREATE`-Fixtures zu warten.
   */
  injectReady(data: GatewayReadyDispatchData): void {
    this.manager.emit(WebSocketShardEvents.Ready, { data, shardId: 0 });
    this.injectDispatch({ t: GatewayDispatchEvents.Ready, op: GatewayOpcodes.Dispatch, s: 1, d: data });
  }

  /** Injiziert ein rohes Gateway-Dispatch-Event (z.B. `INTERACTION_CREATE`). */
  injectDispatch(payload: GatewayDispatchPayload): void {
    this.manager.emit(WebSocketShardEvents.Dispatch, { data: payload, shardId: 0 });
  }
}
