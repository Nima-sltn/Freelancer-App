import { describe, expect, it } from "vitest";
import { NavigationMarkovEngine } from "./predictivePrefetch";

describe("NavigationMarkovEngine", () => {
  it("initializes with empty transitions", () => {
    const engine = new NavigationMarkovEngine();
    expect(engine.predictNextRoutes("/")).toEqual([]);
  });

  it("learns transition probabilities across a sequence of routes", () => {
    const engine = new NavigationMarkovEngine({ prefetchThreshold: 0.5 });

    // Simulate sequence: Home -> Projects -> ProjectDetail -> Projects -> ProjectDetail
    engine.recordTransition("/home");
    engine.recordTransition("/projects");
    engine.recordTransition("/projects/1");
    engine.recordTransition("/projects");
    engine.recordTransition("/projects/1");

    // From /projects, user went to /projects/1 twice out of 2 times
    const predictions = engine.predictNextRoutes("/projects");
    expect(predictions.length).toBeGreaterThan(0);
    const top = predictions[0]!;
    expect(top.route).toBe("/projects/1");
    expect(top.probability).toBeGreaterThan(0.6);
    expect(top.shouldPrefetch).toBe(true);
  });

  it("differentiates high probability vs low probability branches", () => {
    const engine = new NavigationMarkovEngine({ prefetchThreshold: 0.5 });

    // 4 times: Dashboard -> Wallet
    // 1 time: Dashboard -> Settings
    for (let i = 0; i < 4; i++) {
      engine.recordTransition("/dashboard");
      engine.recordTransition("/wallet");
    }
    engine.recordTransition("/dashboard");
    engine.recordTransition("/settings");

    const predictions = engine.predictNextRoutes("/dashboard");
    const walletPred = predictions.find((p) => p.route === "/wallet");
    const settingsPred = predictions.find((p) => p.route === "/settings");

    expect(walletPred).toBeDefined();
    expect(settingsPred).toBeDefined();
    expect(walletPred!.probability).toBeGreaterThan(settingsPred!.probability);
    expect(walletPred!.shouldPrefetch).toBe(true);
    expect(settingsPred!.shouldPrefetch).toBe(false);
  });

  it("serializes and rehydrates model state accurately", () => {
    const engineA = new NavigationMarkovEngine();
    engineA.recordTransition("/a");
    engineA.recordTransition("/b");
    const serialized = engineA.serialize();

    const engineB = new NavigationMarkovEngine();
    engineB.rehydrate(serialized);
    const predB = engineB.predictNextRoutes("/a");
    expect(predB[0]?.route).toBe("/b");
  });
});
