import {
  createSignal,
  type PatternHandle,
  Priority,
  type ReadonlySignal,
  ticker,
} from '@snowbros/core';
import type { QualityLevel, Stage } from './stage.js';

const ORDER: QualityLevel[] = ['low', 'mid', 'high'];

export interface GovernorDecisionInput {
  level: QualityLevel;
  /** Average frame time over the sample window, ms. */
  averageMs: number;
  targetFps: number;
  /** Consecutive good windows observed at this level. */
  goodWindows: number;
  /** Highest level allowed (never upgrade past this). */
  ceiling: QualityLevel;
  /** Good windows required before stepping up. Default 3. */
  upgradeAfter?: number;
}

/**
 * Pure decision step with hysteresis: drop one level as soon as a window misses the budget by
 * more than 15%, but only step up after several consecutive windows comfortably under it
 * (≤ 70% of budget). Prevents oscillating between levels.
 */
export function decideQuality(input: GovernorDecisionInput): {
  level: QualityLevel;
  goodWindows: number;
} {
  const budget = 1000 / input.targetFps;
  const idx = ORDER.indexOf(input.level);
  if (input.averageMs > budget * 1.15 && idx > 0) {
    return { level: ORDER[idx - 1]!, goodWindows: 0 };
  }
  if (input.averageMs <= budget * 0.7) {
    const good = input.goodWindows + 1;
    const ceilingIdx = ORDER.indexOf(input.ceiling);
    if (good >= (input.upgradeAfter ?? 3) && idx < ceilingIdx) {
      return { level: ORDER[idx + 1]!, goodWindows: 0 };
    }
    return { level: input.level, goodWindows: good };
  }
  return { level: input.level, goodWindows: 0 };
}

export interface QualityGovernorOptions {
  /** Default 60. Use 30 for intentionally capped low-tier stages. */
  targetFps?: number;
  /** Frames per measurement window. Default 60. */
  sampleFrames?: number;
  /** Highest level the governor may restore. Default: the stage's starting quality. */
  ceiling?: QualityLevel;
}

/**
 * Adapt the stage's quality (pixel ratio) to measured frame time. Heuristic device tiers pick
 * the start level; the governor corrects it with real data.
 */
export function createQualityGovernor(
  stage: Stage,
  options: QualityGovernorOptions = {},
): ReadonlySignal<QualityLevel> & PatternHandle {
  const level = createSignal<QualityLevel>(stage.quality);
  const targetFps = options.targetFps ?? 60;
  const sampleFrames = options.sampleFrames ?? 60;
  const ceiling = options.ceiling ?? stage.quality;
  let total = 0;
  let count = 0;
  let goodWindows = 0;

  const off = ticker.add((frame) => {
    if (!stage.active || frame.delta <= 0) return;
    total += frame.delta * 1000;
    count++;
    if (count < sampleFrames) return;
    const decision = decideQuality({
      level: level.get(),
      averageMs: total / count,
      targetFps,
      goodWindows,
      ceiling,
    });
    total = 0;
    count = 0;
    goodWindows = decision.goodWindows;
    if (decision.level !== level.get()) {
      level.set(decision.level);
      stage.setQuality(decision.level);
    }
  }, Priority.render + 1);

  return { get: level.get, subscribe: level.subscribe, dispose: off };
}
