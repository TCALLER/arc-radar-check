import { describe, expect, it } from 'vitest';

import { ApiError } from '@/common/api/api-error';

import checkError from '@samples/check-error.json';
import checkOk from '@samples/check-ok.json';
import checkPaymentRequired from '@samples/check-payment-required.json';

import {
  countCleanedLabels,
  describeBurns,
  describeBuybackNote,
  describeClaim,
  describeCleanedLabels,
  formatCount,
  formatIntegerString,
  formatPercent,
  hasCodeLikeText,
  hasBurnBar,
  pluralize,
  shortenAddress,
  toAccessState,
  toAnnouncement,
  toCheckView,
  readLinkedToken,
  toShareUrl,
  toTimelineIndex,
  toDataBadge,
} from './functions';
import { CheckResponseSchema } from './schema';

describe('formatIntegerString', () => {
  it('adds separators without converting to a number', () => {
    expect(formatIntegerString('1000000000')).toBe('1,000,000,000');
    expect(formatIntegerString('1000000000000000000000000')).toBe(
      '1,000,000,000,000,000,000,000,000',
    );
    expect(formatIntegerString('0')).toBe('0');
    expect(formatIntegerString('999')).toBe('999');
  });

  it('leaves anything that is not plain digits unchanged', () => {
    expect(formatIntegerString('12.5')).toBe('12.5');
  });
});

describe('small formatters', () => {
  it('formats counts, percentages and addresses', () => {
    expect(formatCount(1284)).toBe('1,284');
    expect(formatPercent(58.4)).toBe('58.4%');
    expect(formatPercent(0)).toBe('0%');
    expect(shortenAddress('0x2222222222222222222222222222222222222222')).toBe('0x2222…2222');
    expect(shortenAddress('0x12')).toBe('0x12');
    expect(pluralize(1, 'sign', 'signs')).toBe('sign');
    expect(pluralize(2, 'sign', 'signs')).toBe('signs');
  });
});

describe('describeClaim', () => {
  it('writes claims as facts', () => {
    expect(describeClaim({ claimed: true, verified: true })).toEqual({
      text: 'Claimed and verified on-chain',
      tone: 'ok',
    });
    expect(describeClaim({ claimed: true, verified: false })).toEqual({
      text: 'Claimed, not confirmed on-chain',
      tone: 'caution',
    });
    expect(describeClaim({ claimed: false, verified: false })).toEqual({
      text: 'Not claimed',
      tone: 'muted',
    });
  });
});

describe('describeBurns', () => {
  const base = {
    claimed: true,
    verified: true,
    total_burned: '125000000',
    burned_pct_of_supply: 12.5,
  };

  it('states the amount and share', () => {
    expect(
      describeBurns({ ...base, events: [{ tx_hash: '0x1', amount: '1', timestamp: '' }] }),
    ).toBe('125,000,000 tokens burned, 12.5% of supply.');
  });

  it('adds that no transactions were found when there are none', () => {
    expect(
      describeBurns({
        ...base,
        verified: false,
        total_burned: '0',
        burned_pct_of_supply: 0,
        events: [],
      }),
    ).toBe('0 tokens burned, 0% of supply. No burn transactions found.');
  });

  it('says when nothing is claimed', () => {
    const notClaimed = {
      claimed: false,
      verified: false,
      total_burned: '0',
      burned_pct_of_supply: 0,
      events: [],
    };
    expect(describeBurns(notClaimed)).toBe("The project doesn't claim burns.");
    expect(hasBurnBar(notClaimed)).toBe(false);
    expect(hasBurnBar({ ...notClaimed, claimed: true })).toBe(true);
  });
});

describe('describeBuybackNote', () => {
  it('uses the API note when there is one', () => {
    expect(describeBuybackNote({ claimed: true, verified: false, note: 'No purchases.' })).toBe(
      'No purchases.',
    );
  });

  it('derives a fact from claimed: false with no note', () => {
    expect(describeBuybackNote({ claimed: false, verified: false, note: null })).toBe(
      "The project doesn't claim to buy back tokens.",
    );
  });

  it('adds nothing for a claim without a note', () => {
    expect(describeBuybackNote({ claimed: true, verified: true, note: null })).toBeNull();
  });
});

describe('cleaned labels', () => {
  const holder = (label: string | null) => ({ address: '0x1', share_pct: 1, label });

  it('counts labels that had hidden characters', () => {
    expect(countCleanedLabels([holder('‮evil'), holder('ok'), holder(null), holder('')])).toBe(1);
  });

  it('describes one or several', () => {
    expect(describeCleanedLabels(0)).toBeNull();
    expect(describeCleanedLabels(1)).toBe(
      'One label had hidden text-direction characters. We removed them.',
    );
    expect(describeCleanedLabels(2)).toBe(
      '2 labels had hidden text-direction characters. We removed them.',
    );
  });
});

describe('toCheckView', () => {
  const address = '0x1111111111111111111111111111111111111111';
  const idleQuery = { data: undefined, error: null, isFetching: false };

  it('is idle without an address and scanning while fetching', () => {
    expect(toCheckView(null, idleQuery)).toEqual({ kind: 'idle' });
    expect(toCheckView(address, { ...idleQuery, isFetching: true })).toEqual({ kind: 'scanning' });
  });

  it('separates timeouts from other failures', () => {
    expect(
      toCheckView(address, { ...idleQuery, error: new ApiError('t', null, null, true) }),
    ).toEqual({ kind: 'timeout' });
    expect(toCheckView(address, { ...idleQuery, error: new ApiError('n', null, null) })).toEqual({
      kind: 'failed',
    });
    expect(toCheckView(address, { ...idleQuery, error: new Error('x') })).toEqual({
      kind: 'failed',
    });
  });

  it('maps each response status', () => {
    const ok = CheckResponseSchema.parse(checkOk);
    expect(toCheckView(address, { ...idleQuery, data: ok })).toEqual({ kind: 'result', data: ok });
    expect(
      toCheckView(address, { ...idleQuery, data: CheckResponseSchema.parse(checkError) }),
    ).toEqual({
      kind: 'apiError',
      message: 'No token contract was found at this address on Arc mainnet.',
    });
    expect(
      toCheckView(address, { ...idleQuery, data: CheckResponseSchema.parse(checkPaymentRequired) }),
    ).toEqual({
      kind: 'payment',
      priceUsdc: '0.50',
    });
  });
});

describe('toAccessState', () => {
  const noWallet = { status: 'disconnected' as const, address: null };
  const wallet = {
    status: 'connected' as const,
    address: '0x3f2a000000000000000000000000000000009c1d',
  };
  const idle = { data: undefined, error: null, isFetching: false };

  it('stays locked without a wallet', () => {
    expect(toAccessState(noWallet, idle)).toBe('locked');
    expect(toAccessState({ status: 'noProvider', address: null }, idle)).toBe('noWallet');
    expect(toAccessState({ status: 'connecting', address: null }, idle)).toBe('connecting');
  });

  it('checks while the access call runs', () => {
    expect(toAccessState(wallet, { ...idle, isFetching: true })).toBe('checking');
    expect(toAccessState(wallet, idle)).toBe('checking');
  });

  it('never unlocks on failure', () => {
    expect(toAccessState(wallet, { ...idle, error: new Error('down') })).toBe('failed');
  });

  it('unlocks only for holder: true', () => {
    expect(toAccessState(wallet, { ...idle, data: { holder: true } })).toBe('holder');
    expect(toAccessState(wallet, { ...idle, data: { holder: false } })).toBe('notHolder');
  });
});

describe('toTimelineIndex', () => {
  it('counts drawn blips, capped at 8', () => {
    expect(toTimelineIndex(0)).toBe(0);
    expect(toTimelineIndex(2)).toBe(2);
    expect(toTimelineIndex(8)).toBe(8);
    expect(toTimelineIndex(12)).toBe(8);
  });
});

describe('toAnnouncement', () => {
  const ok = CheckResponseSchema.parse(checkOk);

  it('announces the scan and the result', () => {
    expect(toAnnouncement({ kind: 'scanning' })).toBe('Scanning Arc…');
    if (ok.status !== 'ok') throw new Error('expected ok sample');
    expect(toAnnouncement({ kind: 'result', data: ok })).toBe(
      'Result: Be careful. 2 warning signs found.',
    );
  });

  it('uses singular and "No" for one or zero flags', () => {
    if (ok.status !== 'ok') throw new Error('expected ok sample');
    const first = ok.risk_flags.slice(0, 1);
    expect(toAnnouncement({ kind: 'result', data: { ...ok, risk_flags: first } })).toBe(
      'Result: Be careful. 1 warning sign found.',
    );
    expect(toAnnouncement({ kind: 'result', data: { ...ok, risk_flags: [] } })).toBe(
      'Result: Be careful. No warning signs found.',
    );
  });

  it('leaves idle and error states to their own messages', () => {
    expect(toAnnouncement({ kind: 'idle' })).toBe('');
    expect(toAnnouncement({ kind: 'timeout' })).toBe('');
    expect(toAnnouncement({ kind: 'apiError', message: 'x' })).toBe('');
  });
});

describe('toShareUrl', () => {
  it('adds the checked token, keeps other parameters and drops the dev state switch', () => {
    const url = toShareUrl(
      'https://app.example/?holder=true&state=locked',
      '0x1111111111111111111111111111111111111111',
    );
    expect(url).toBe(
      'https://app.example/?holder=true&token=0x1111111111111111111111111111111111111111',
    );
  });

  it('leaves the link as it is without a checked token', () => {
    expect(toShareUrl('https://app.example/', null)).toBe('https://app.example/');
  });

  it("drops Telegram's launch data, so the opened page isn't the Mini App", () => {
    expect(
      toShareUrl(
        'https://app.example/?holder=true#tgWebAppData=user%3D%7B%7D&tgWebAppVersion=8.0',
        null,
      ),
    ).toBe('https://app.example/?holder=true');
  });
});

describe('readLinkedToken', () => {
  it('accepts only a valid address', () => {
    expect(readLinkedToken(' 0x1111111111111111111111111111111111111111 ')).toBe(
      '0x1111111111111111111111111111111111111111',
    );
    expect(readLinkedToken('<script>')).toBeNull();
    expect(readLinkedToken(null)).toBeNull();
  });
});

describe('hasCodeLikeText', () => {
  it('spots HTML-like text in any of the values', () => {
    expect(hasCodeLikeText('Sample Token', "<script>alert('x')</script>")).toBe(true);
    expect(hasCodeLikeText('a > b')).toBe(true);
  });

  it('is false for ordinary names', () => {
    expect(hasCodeLikeText('Sample Token', 'SMPL')).toBe(false);
    expect(hasCodeLikeText()).toBe(false);
  });
});

describe('toDataBadge', () => {
  it('says "Mock version" whenever mocking is on', () => {
    expect(toDataBadge(true, false)).toBe('Mock version');
    expect(toDataBadge(true, true)).toBe('Mock version');
  });

  it('shows no badge on the live API', () => {
    expect(toDataBadge(false, false)).toBeNull();
  });

  it('still marks a live response flagged as sample data', () => {
    expect(toDataBadge(false, true)).toBe('Sample data');
  });
});
