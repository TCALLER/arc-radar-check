import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import { logger } from '@/common/utils/logger';

import { TokenAddressSchema } from '../validation';

import type { CheckFormProps } from './types';

/** Address field state: validates on submit, then on every change once an error is shown. */
export const useCheckForm = ({ checkedAddress, initialValue = '', onSubmit }: CheckFormProps) => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [shakeCount, setShakeCount] = useState(0);
  const [isPasteBlocked, setIsPasteBlocked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (raw: string) => TokenAddressSchema.safeParse(raw);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setValue(next);
    setIsPasteBlocked(false);
    if (error) {
      const result = validate(next);
      setError(result.success ? null : (result.error.issues[0]?.message ?? null));
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = validate(value);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? null);
      setShakeCount((count) => count + 1);
      inputRef.current?.focus();
      return;
    }
    setError(null);
    setValue(result.data);
    onSubmit(result.data);
  };

  const handlePaste = () => {
    const showManualPaste = () => {
      setIsPasteBlocked(true);
      inputRef.current?.focus();
    };
    if (!navigator.clipboard?.readText) {
      showManualPaste();
      return;
    }
    navigator.clipboard
      .readText()
      .then((text) => {
        setValue(text.trim());
        setError(null);
        setIsPasteBlocked(false);
      })
      .catch((pasteError: unknown) => {
        // Clipboard access denied: say how to paste by hand instead of failing silently.
        logger.warn('Clipboard read failed', pasteError);
        showManualPaste();
      });
  };

  const handleClear = () => {
    setValue('');
    setError(null);
    inputRef.current?.focus();
  };

  const isEmpty = value === '';
  const isEdited = value.trim().toLowerCase() !== (checkedAddress ?? '').toLowerCase();

  return {
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
  };
};
