'use client';

import { ClipboardPaste, X } from 'lucide-react';

import { Button } from '@/common/components/components/button';
import { TextInput } from '@/common/components/components/text-input';
import { cn } from '@/common/utils/global-utility';

import { useCheckForm } from './use-check-form';

import type { CheckFormProps } from './types';

const INPUT_ID = 'token-address';
const PASTE_BLOCKED_HELP =
  "Your browser didn't allow Paste. Press and hold in the field and choose Paste, or press Ctrl+V (⌘V on Mac).";

/** Headline, address field (Paste / Clear) and Check. Nothing is sent until it validates. */
export function CheckForm(props: CheckFormProps) {
  const { checkedAddress, isScanning, autoFocus } = props;
  const {
    value,
    error,
    shakeCount,
    isPasteBlocked,
    inputRef,
    isEmpty,
    isEdited,
    handleChange,
    handleSubmit,
    handlePaste,
    handleClear,
  } = useCheckForm(props);
  const hasResult = checkedAddress !== null;

  return (
    <section aria-labelledby="page-title" className="flex flex-col gap-6">
      <div className={cn('flex flex-col gap-3', hasResult && 'sr-only lg:not-sr-only')}>
        <h1
          id="page-title"
          className="text-[32px] leading-[1.05] font-extrabold tracking-tight lg:text-[44px]"
        >
          See what&rsquo;s behind any token
        </h1>
        <p className="max-w-[36ch] text-muted-foreground">
          Paste a token address on Arc to see its verdict, who holds it, whether claimed burns and
          buybacks show up on-chain, and any warning signs.
        </p>
      </div>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
        <TextInput
          ref={inputRef}
          id={INPUT_ID}
          label="Token address"
          placeholder="0x…"
          mono
          shakeCount={shakeCount}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
          enterKeyHint="search"
          value={value}
          onChange={handleChange}
          error={error}
          helper={
            isPasteBlocked
              ? PASTE_BLOCKED_HELP
              : hasResult
                ? undefined
                : 'Starts with 0x. No wallet needed.'
          }
          trailing={
            isEmpty ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePaste}
                className="bg-inset"
              >
                <ClipboardPaste aria-hidden />
                Paste
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Clear address"
                onClick={handleClear}
              >
                <X aria-hidden className="text-muted-foreground" />
              </Button>
            )
          }
        />
        {(!hasResult || isEdited || isScanning) && (
          <Button type="submit" disabled={isScanning} className="w-full">
            {isScanning ? 'Scanning…' : 'Check token'}
          </Button>
        )}
      </form>
    </section>
  );
}
