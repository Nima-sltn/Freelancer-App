import { describe, expect, it } from "vitest";
import { TactileSoundEngine } from "./soundEngine";

describe("TactileSoundEngine", () => {
  it("initializes disabled by default and supports toggle", () => {
    const engine = new TactileSoundEngine();
    expect(engine.isAudioEnabled).toBe(false);
    engine.setEnabled(true);
    expect(engine.isAudioEnabled).toBe(true);
    engine.destroy();
  });

  it("safely handles play invocations when audio is disabled", () => {
    const engine = new TactileSoundEngine({ enabled: false });
    expect(() => {
      engine.play("click");
      engine.play("commit");
      engine.play("success");
      engine.play("rollback");
    }).not.toThrow();
    engine.destroy();
  });

  it("safely handles play invocations in headless/test environments without real AudioContext", () => {
    const engine = new TactileSoundEngine({ enabled: true });
    expect(() => {
      engine.play("click");
    }).not.toThrow();
    engine.destroy();
  });
});
