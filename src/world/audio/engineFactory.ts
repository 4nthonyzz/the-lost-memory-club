/**
 * Creates the world audio engine for a WorldScene mount. The factory can be replaced in tests only
 * (`__setWorldAudioFactoryForTests`); production code never calls the setter, so WorldSceneProps stays unchanged.
 */
import { createWorldAudioEngine, type WorldAudioEngine } from './worldAudio';

let factoryOverride: (() => WorldAudioEngine) | null = null;

export function createWorldAudio(): WorldAudioEngine {
  return factoryOverride ? factoryOverride() : createWorldAudioEngine();
}

/** TEST ONLY. Pass null to restore the real engine. */
export function __setWorldAudioFactoryForTests(factory: (() => WorldAudioEngine) | null): void {
  factoryOverride = factory;
}
