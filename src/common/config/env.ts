import { z } from 'zod';

const FlagSchema = z.enum(['enabled', 'disabled']).default('disabled');

const ClientEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.url(),
  NEXT_PUBLIC_API_MOCKING: FlagSchema,
  NEXT_PUBLIC_AUTH_MOCKING: FlagSchema,
  // Required with no fallback: a missing RPC URL must fail loudly, never fall back to a public one.
  NEXT_PUBLIC_ARC_RPC_URL: z.url(),
  // Price on a locked full result, whose response carries no price.
  // Optional: unset or empty shows "Pay per check". A 402 response always uses its own price.
  NEXT_PUBLIC_CHECK_PRICE_USDC: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z
      .string()
      .regex(/^\d+(\.\d+)?$/, 'Use a plain decimal such as 0.50')
      .optional(),
  ),
});

export type ClientEnv = z.infer<typeof ClientEnvSchema>;

/** Validates raw env values. Exported for tests; the app uses `env`. */
export const parseClientEnv = (raw: Record<string, string | undefined>): ClientEnv => {
  const parsed = ClientEnvSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
};

// Each NEXT_PUBLIC_* value must be referenced explicitly so Next.js can inline it at build time.
export const env = parseClientEnv({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING,
  NEXT_PUBLIC_AUTH_MOCKING: process.env.NEXT_PUBLIC_AUTH_MOCKING,
  NEXT_PUBLIC_ARC_RPC_URL: process.env.NEXT_PUBLIC_ARC_RPC_URL,
  NEXT_PUBLIC_CHECK_PRICE_USDC: process.env.NEXT_PUBLIC_CHECK_PRICE_USDC,
});
