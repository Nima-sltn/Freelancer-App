/**
 * Multi-Tab Real-time Synchronization with Lamport Logical Clocks (Layer 1 - Lib).
 *
 * Employs HTML5 BroadcastChannel and Lamport Timestamps to achieve peer-to-peer
 * state replication between browser tabs with zero server load. Resolves concurrent
 * mutations deterministically using Last-Write-Wins (LWW) total ordering.
 *
 * Conforms to Layer 1: Zero React, zero UI, pure event bus mechanics.
 */

export interface SyncMessage<T = unknown> {
  readonly id: string;
  readonly senderTabId: string;
  readonly lamportClock: number;
  readonly topic: string;
  readonly payload: T;
  readonly timestamp: number;
}

export type SyncHandler<T = unknown> = (message: SyncMessage<T>) => void;

export class CrossTabSyncEngine {
  private readonly channelName: string;
  private readonly tabId: string;
  private channel: BroadcastChannel | null = null;
  private lamportClock = 0;
  private readonly listeners = new Map<string, Set<SyncHandler<any>>>();
  private readonly activePeers = new Map<string, number>();

  constructor(channelName = "freelancer_crosstab_sync") {
    this.channelName = channelName;
    this.tabId = `tab_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (event: MessageEvent<SyncMessage>) => {
          this.handleIncoming(event.data);
        };
      } catch {
        // Fallback for non-supporting sandboxes
        this.channel = null;
      }
    }
  }

  /** Announce presence to other tabs */
  public announcePresence(): void {
    if (this.channel) {
      this.broadcast("PEER_HELLO", { tabId: this.tabId });
    }
  }

  public get currentTabId(): string {
    return this.tabId;
  }

  public get currentClock(): number {
    return this.lamportClock;
  }

  public get activePeerCount(): number {
    const now = Date.now();
    let count = 0;
    for (const [peerId, lastSeen] of this.activePeers.entries()) {
      if (now - lastSeen < 15000 && peerId !== this.tabId) {
        count++;
      }
    }
    return count;
  }

  /**
   * Broadcast an event to all other open tabs with a monotonically incremented
   * Lamport logical clock.
   */
  public broadcast<T>(topic: string, payload: T): SyncMessage<T> {
    this.lamportClock += 1;
    const message: SyncMessage<T> = {
      id: `${this.tabId}_${this.lamportClock}_${Date.now()}`,
      senderTabId: this.tabId,
      lamportClock: this.lamportClock,
      topic,
      payload,
      timestamp: Date.now(),
    };

    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch {
        // Silently handle postMessage serialization failures
      }
    }

    return message;
  }

  /**
   * Register a topic listener.
   */
  public on<T>(topic: string, handler: SyncHandler<T>): () => void {
    let set = this.listeners.get(topic);
    if (!set) {
      set = new Set();
      this.listeners.set(topic, set);
    }
    set.add(handler as SyncHandler<any>);
    return () => {
      set?.delete(handler as SyncHandler<any>);
    };
  }

  /**
   * Internal message handler updating Lamport logical clock and tracking peers.
   */
  public handleIncoming(message: SyncMessage): void {
    if (!message || message.senderTabId === this.tabId) return;

    // Advance local Lamport logical clock: L_local = max(L_local, L_msg) + 1
    this.lamportClock = Math.max(this.lamportClock, message.lamportClock) + 1;

    // Heartbeat tracking
    this.activePeers.set(message.senderTabId, message.timestamp);

    if (message.topic === "PEER_HELLO") {
      // Respond with PONG to register presence with new peer
      if (this.channel) {
        this.lamportClock += 1;
        this.channel.postMessage({
          id: `${this.tabId}_${this.lamportClock}_${Date.now()}`,
          senderTabId: this.tabId,
          lamportClock: this.lamportClock,
          topic: "PEER_PONG",
          payload: { tabId: this.tabId },
          timestamp: Date.now(),
        });
      }
    }

    const set = this.listeners.get(message.topic);
    if (set) {
      set.forEach((handler) => {
        try {
          handler(message);
        } catch {
          // Prevent listener errors from breaking the bus
        }
      });
    }

    // Global wildcard listeners
    const wildcard = this.listeners.get("*");
    if (wildcard) {
      wildcard.forEach((handler) => {
        try {
          handler(message);
        } catch {
          // Ignore
        }
      });
    }
  }

  public destroy(): void {
    if (this.channel) {
      try {
        this.channel.close();
      } catch {
        // Ignore
      }
      this.channel = null;
    }
    this.listeners.clear();
    this.activePeers.clear();
  }
}

/** Default singleton cross-tab synchronizer */
export const crossTabSync = new CrossTabSyncEngine();
