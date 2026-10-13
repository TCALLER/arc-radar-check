import { describe, expect, it } from 'vitest';

import { DEV_SCENARIOS, getDevScenario } from './dev-scenarios';

describe('getDevScenario', () => {
  it('is off when mocking is disabled', () => {
    expect(getDevScenario('holder', false)).toEqual({});
  });

  it('returns the scenario for a known state id', () => {
    expect(getDevScenario('holder', true)).toBe(DEV_SCENARIOS.holder);
  });

  it('ignores unknown ids and inherited object keys', () => {
    expect(getDevScenario('nope', true)).toEqual({});
    expect(getDevScenario('constructor', true)).toEqual({});
    expect(getDevScenario(null, true)).toEqual({});
  });
});
