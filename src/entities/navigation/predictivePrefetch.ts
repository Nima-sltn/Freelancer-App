/**
 * Predictive Intent Engine & First-Order Markov Transition Chain (Layer 2 - Domain Entity).
 *
 * Models client navigation flows as a discrete-time Markov chain to anticipate
 * user destination states. Pre-warms route components and React Query caches
 * when the transition likelihood $P(S_{t+1} \mid S_t)$ exceeds the decision threshold.
 *
 * Conforms to Layer 2: Pure mathematical model, zero React, zero DOM dependencies.
 */

export interface TransitionPrediction {
  readonly route: string;
  readonly probability: number;
  readonly sampleCount: number;
  readonly shouldPrefetch: boolean;
}

export interface MarkovEngineOptions {
  /** Minimum transition likelihood required to trigger prefetch (default 0.45 = 45%) */
  readonly prefetchThreshold?: number;
  /** Laplace smoothing parameter to prevent division by zero (default 0.5) */
  readonly smoothingAlpha?: number;
  /** Maximum history steps retained in memory */
  readonly maxHistory?: number;
}

export class NavigationMarkovEngine {
  private readonly threshold: number;
  private readonly alpha: number;
  private readonly maxHistory: number;
  /** Transition counts: stateFrom -> (stateTo -> count) */
  private readonly transitionCounts = new Map<string, Map<string, number>>();
  private readonly stateVisits = new Map<string, number>();
  private lastRoute: string | null = null;

  constructor(options: MarkovEngineOptions = {}) {
    this.threshold = options.prefetchThreshold ?? 0.45;
    this.alpha = options.smoothingAlpha ?? 0.5;
    this.maxHistory = options.maxHistory ?? 100;
  }

  public get historyLimit(): number {
    return this.maxHistory;
  }

  /**
   * Records a user transition from the previous state to the current route.
   */
  public recordTransition(currentRoute: string): void {
    if (!currentRoute) return;

    // Increment visit count
    const visits = this.stateVisits.get(currentRoute) ?? 0;
    this.stateVisits.set(currentRoute, visits + 1);

    if (this.lastRoute && this.lastRoute !== currentRoute) {
      let destinations = this.transitionCounts.get(this.lastRoute);
      if (!destinations) {
        destinations = new Map();
        this.transitionCounts.set(this.lastRoute, destinations);
      }
      const count = destinations.get(currentRoute) ?? 0;
      destinations.set(currentRoute, count + 1);
    }

    this.lastRoute = currentRoute;
  }

  /**
   * Predicts the most probable next routes given the current route, using
   * maximum likelihood estimation with Laplace smoothing.
   */
  public predictNextRoutes(
    currentRoute: string,
    candidateRoutes: readonly string[] = []
  ): readonly TransitionPrediction[] {
    const destinations = this.transitionCounts.get(currentRoute);
    if (!destinations || destinations.size === 0) {
      return [];
    }

    // Determine all known candidate targets
    const allCandidates = new Set<string>([
      ...destinations.keys(),
      ...candidateRoutes,
    ]);

    let totalTransitionsFromCurrent = 0;
    for (const count of destinations.values()) {
      totalTransitionsFromCurrent += count;
    }

    const V = Math.max(allCandidates.size, 1);
    const denominator = totalTransitionsFromCurrent + this.alpha * V;

    const predictions: TransitionPrediction[] = [];

    for (const candidate of allCandidates) {
      const count = destinations.get(candidate) ?? 0;
      // Laplace smoothed probability
      const probability = (count + this.alpha) / denominator;
      const rounded = Math.round(probability * 1000) / 1000;

      predictions.push({
        route: candidate,
        probability: rounded,
        sampleCount: count,
        shouldPrefetch: rounded >= this.threshold && count > 0,
      });
    }

    return predictions.sort((a, b) => b.probability - a.probability);
  }

  /**
   * Serializes current learned transitions for persistent storage.
   */
  public serialize(): Record<string, Record<string, number>> {
    const out: Record<string, Record<string, number>> = {};
    for (const [from, dests] of this.transitionCounts.entries()) {
      out[from] = Object.fromEntries(dests.entries());
    }
    return out;
  }

  /**
   * Rehydrates learned transitions from a persistent record.
   */
  public rehydrate(data: Record<string, Record<string, number>>): void {
    this.transitionCounts.clear();
    for (const [from, dests] of Object.entries(data)) {
      this.transitionCounts.set(from, new Map(Object.entries(dests)));
    }
  }

  public reset(): void {
    this.transitionCounts.clear();
    this.stateVisits.clear();
    this.lastRoute = null;
  }
}
