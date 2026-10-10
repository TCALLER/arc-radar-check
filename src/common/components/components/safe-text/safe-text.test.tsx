import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SafeText } from './safe-text';

const LONG_LABEL =
  'OFFICIAL_SAFE_VERIFIED_BY_CIRCLE_TRUST_ME_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

/** jsdom has no layout, so simulate text that overflows its box. */
const simulateOverflow = () => {
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(500);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100);
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('SafeText', () => {
  it('renders HTML-like text literally, without creating elements', () => {
    const { container } = render(
      <SafeText value={"<script>alert('x')</script><img src=x onerror=alert(1)>"} />,
    );

    expect(
      screen.getByText("<script>alert('x')</script><img src=x onerror=alert(1)>"),
    ).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('isolates the text in <bdi> and strips direction overrides', () => {
    const { container } = render(<SafeText value={'‮evil-label'} />);
    const bdi = container.querySelector('bdi');

    expect(bdi).toHaveTextContent('evil-label');
    expect(bdi?.textContent).not.toContain('‮');
  });

  it('shows the fallback when nothing is left after cleaning', () => {
    render(<SafeText value="" fallback="Unlabelled" />);
    expect(screen.getByText('Unlabelled').parentElement).toHaveClass('text-muted-foreground');
  });

  it('is plain text, not a button, when it fits', () => {
    render(<SafeText value="Sample Token" lines={1} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('truncates long text with the full value on hover and expands on tap', async () => {
    simulateOverflow();
    render(<SafeText value={LONG_LABEL} lines={1} />);

    const toggle = screen.getByRole('button', { expanded: false });
    expect(screen.getByTitle(LONG_LABEL)).toHaveClass('truncate');

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTitle(LONG_LABEL)).not.toHaveClass('truncate');
  });

  it('expands with the keyboard (Enter)', async () => {
    simulateOverflow();
    render(<SafeText value={LONG_LABEL} lines={1} />);

    await userEvent.tab();
    await userEvent.keyboard('{Enter}');

    expect(screen.getByRole('button', { expanded: true })).toBeInTheDocument();
  });

  it('shows a visible "Show full name" toggle when asked', async () => {
    simulateOverflow();
    render(<SafeText value={LONG_LABEL} lines={1} expandLabel="Show full name" />);

    await userEvent.click(screen.getByText('Show full name'));

    expect(screen.getByText('Show less')).toBeInTheDocument();
  });
});

describe('SafeText truncation stays stable', () => {
  it('keeps the tap target after re-measuring the new element', async () => {
    simulateOverflow();
    render(<SafeText value={LONG_LABEL} lines={1} />);

    expect(await screen.findByRole('button', { expanded: false })).toBeInTheDocument();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(screen.getByRole('button', { expanded: false })).toBeInTheDocument();
  });

  it('does not flip back and forth when the text only fits as a button', async () => {
    // Near the edge: cut off as plain text, but fits inside the tappable button.
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.closest('button') ? 100 : 102;
    });
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100);
    render(<SafeText value={LONG_LABEL} lines={1} />);

    expect(await screen.findByRole('button', { expanded: false })).toBeInTheDocument();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(screen.getByRole('button', { expanded: false })).toBeInTheDocument();
  });

  it('becomes plain text again when the window gets wider and the text fits', async () => {
    // jsdom has no ResizeObserver; capture the callback to simulate the container resizing.
    const resizeCallbacks: (() => void)[] = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resizeCallbacks.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );
    const scrollWidth = vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(500);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100);
    render(<SafeText value={LONG_LABEL} lines={1} />);
    expect(await screen.findByRole('button', { expanded: false })).toBeInTheDocument();

    scrollWidth.mockReturnValue(100);
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(window.innerWidth + 400);
    act(() => resizeCallbacks.forEach((callback) => callback()));

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(LONG_LABEL)).toBeInTheDocument();
  });
});
