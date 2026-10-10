import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { toSafeDisplayText } from '@/common/utils/global-utility';

type UseSafeTextParams = {
  value: string | null | undefined;
  fallback?: string;
};

/** Cleans an untrusted string for display and tracks whether it is cut off and expanded. */
export const useSafeText = ({ value, fallback = '' }: UseSafeTextParams) => {
  const { text: cleanText } = toSafeDisplayText(value ?? '');
  const isFallback = cleanText.trim() === '';
  const text = isFallback ? fallback : cleanText;

  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  // The text and window width at which it was last cut off. See `measure` below.
  const truncatedAt = useRef<{ text: string; windowWidth: number } | null>(null);

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element || isExpanded) return;

    let isActive = true;
    const measure = () => {
      if (!isActive) return;
      const isOverflowing =
        element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight;
      if (isOverflowing) {
        truncatedAt.current = { text, windowWidth: window.innerWidth };
        setIsTruncated(true);
        return;
      }
      // Cut-off text renders as a tappable button, which can give the text a pixel or two more
      // or less room. Near the edge, it then fits as a button but not as plain text, and flipping
      // back and forth loops forever. So once cut off, stay cut off until the text changes or
      // the window gets wider.
      const last = truncatedAt.current;
      if (last && last.text === text && window.innerWidth <= last.windowWidth) return;
      truncatedAt.current = null;
      setIsTruncated(false);
    };
    measure();
    // The first measurement can run before layout and fonts settle (seen in production builds),
    // so measure again on the next frame, on resize of the text or its container, and after fonts load.
    const frame = requestAnimationFrame(measure);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    if (element.parentElement) observer?.observe(element.parentElement);
    void document.fonts?.ready.then(measure);

    return () => {
      isActive = false;
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
    // isTruncated is a dependency: switching to the tappable button renders a new text element,
    // and the measurement must follow it (a detached element measures 0 and would flip back).
  }, [text, isExpanded, isTruncated]);

  const toggleExpanded = useCallback(() => setIsExpanded((expanded) => !expanded), []);

  return { text, isFallback, isTruncated, isExpanded, toggleExpanded, textRef };
};
