import { describe, expect, it } from "vitest";
import { CrossTabSyncEngine, type SyncMessage } from "./crossTabSync";

describe("CrossTabSyncEngine & Lamport Clocks", () => {
  it("initializes with unique tab id and zero clock", () => {
    const engine = new CrossTabSyncEngine("test_channel_1");
    expect(engine.currentTabId).toContain("tab_");
    expect(engine.currentClock).toBe(0);
    engine.destroy();
  });

  it("advances Lamport clock upon broadcasting a message", () => {
    const engine = new CrossTabSyncEngine("test_channel_2");
    const msg1 = engine.broadcast("PROJECT_UPDATED", { id: "p1" });
    expect(msg1.lamportClock).toBe(1);
    expect(engine.currentClock).toBe(1);

    const msg2 = engine.broadcast("PROJECT_UPDATED", { id: "p2" });
    expect(msg2.lamportClock).toBe(2);
    expect(engine.currentClock).toBe(2);
    engine.destroy();
  });

  it("updates Lamport clock monotonically on incoming messages from peers", () => {
    const engine = new CrossTabSyncEngine("test_channel_3");
    // Simulate incoming message from another tab with clock 10
    const foreignMessage: SyncMessage = {
      id: "foreign_1",
      senderTabId: "tab_foreign_99",
      lamportClock: 10,
      topic: "PROPOSAL_ACCEPTED",
      payload: { proposalId: "prop_123" },
      timestamp: Date.now(),
    };

    engine.handleIncoming(foreignMessage);
    // Local clock must be max(0, 10) + 1 = 11
    expect(engine.currentClock).toBe(11);

    // Next local broadcast must be 12
    const nextMsg = engine.broadcast("NOTIFY_UI", {});
    expect(nextMsg.lamportClock).toBe(12);
    engine.destroy();
  });

  it("dispatches messages to topic listeners", () => {
    const engine = new CrossTabSyncEngine("test_channel_4");
    const received: any[] = [];

    const unsubscribe = engine.on("TX_COMMIT", (msg) => {
      received.push(msg.payload);
    });

    engine.handleIncoming({
      id: "incoming_tx",
      senderTabId: "other_tab",
      lamportClock: 5,
      topic: "TX_COMMIT",
      payload: { txId: "tx_999" },
      timestamp: Date.now(),
    });

    expect(received).toEqual([{ txId: "tx_999" }]);

    unsubscribe();
    engine.handleIncoming({
      id: "incoming_tx_2",
      senderTabId: "other_tab",
      lamportClock: 6,
      topic: "TX_COMMIT",
      payload: { txId: "tx_1000" },
      timestamp: Date.now(),
    });

    // Should not receive after unsubscribe
    expect(received).toHaveLength(1);
    engine.destroy();
  });
});
