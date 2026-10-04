import { z } from 'zod';
import { ensureAnonymousSession, supabase } from '../ai/supabaseClient';

// Plans. Limits are enforced on the server (supabase/migrations/*_monthly_plans.sql); these values are for display.
export const PLANS = {
  free: { importsPerMonth: 3 },
  premium: { importsPerMonth: 50, monthlyPrice: '€4.99', yearlyPrice: '€39.99' },
} as const;

export type PlanId = keyof typeof PLANS;

const usageSchema = z.object({
  plan: z.enum(['free', 'premium']),
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

/**
 * In-app purchases go through Apple/Google (required for digital subscriptions). They are connected once the
 * App Store Connect products exist and the app runs as a real build (not Expo Go); until then this reports false.
 */
export const purchasesAvailable = false;
