import { z } from 'zod';
import { ensureAnonymousSession, supabase } from '../ai/supabaseClient';

// Plans. Limits are enforced on the server (supabase/migrations/*_monthly_plans.sql); these values are for display.
export const PLANS = {
  free: { importsPerMonth: 3 },
  premium: { importsPerMonth: 50, monthlyPrice: '€4.99', yearlyPrice: '€39.99' },
  /** Unlocked with a tester code in Settings (see redeemTesterCode). */
  tester: { importsPerMonth: 20 },
} as const;

export type PlanId = keyof typeof PLANS;

/**
 * Whether Plan & billing and "Upgrade to Premium" are shown. Off until App Store in-app purchases are
 * implemented: App Review rejects purchase buttons that don't work. The server-side monthly limits still apply.
 */
export const PREMIUM_VISIBLE = false;

const usageSchema = z.object({
  plan: z.enum(['free', 'premium', 'tester']),
  used: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  resetsAt: z.string(),
});

export type ImportUsage = z.infer<typeof usageSchema>;

/** Current plan and this month's imports, from the recipe service. Null when the service isn't reachable. */
export async function fetchImportUsage(): Promise<ImportUsage | null> {
  if (!supabase) return null;
  try {
    await ensureAnonymousSession();
    const result = await supabase.functions.invoke('recipe-process', { body: { action: 'usage' } });
    if (result.error) return null;
    const parsed = usageSchema.safeParse(result.data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export type RedeemResult = 'ok' | 'invalid' | 'limit' | 'unavailable';

/** Redeems a tester code: on success this account gets the tester allowance (20 imports a month). */
export async function redeemTesterCode(code: string): Promise<RedeemResult> {
  if (!supabase || !code.trim()) return code.trim() ? 'unavailable' : 'invalid';
  try {
    await ensureAnonymousSession();
    const result = await supabase.functions.invoke('recipe-process', { body: { action: 'redeem', code: code.trim() } });
    if (!result.error) return 'ok';
    const status = typeof result.error.context === 'object' && result.error.context !== null && 'status' in result.error.context
      ? Number(result.error.context.status) : undefined;
    return status === 403 ? 'invalid' : status === 429 ? 'limit' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/**
 * In-app purchases go through Apple/Google (required for digital subscriptions). They are connected once the
 * App Store Connect products exist and the app runs as a real build (not Expo Go); until then this reports false.
 */
export const purchasesAvailable = false;
