import type { UserType } from "@/lib/supabase/auth";

type Entitlements = {
  maxMessagesPerHour: number;
  /** Daily cost limit in cents (pence). Null means unlimited. */
  dailyCostLimitCents: number | null;
  /** Monthly cost limit in cents (pence). Null means unlimited. */
  monthlyCostLimitCents: number | null;
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /** Entitlements for admin users — unlimited cost limits. */
  admin: {
    maxMessagesPerHour: 100,
    dailyCostLimitCents: null,
    monthlyCostLimitCents: null,
  },

  /** Entitlements for editor users — 500 cents/day, 5000 cents/month. */
  editor: {
    maxMessagesPerHour: 100,
    dailyCostLimitCents: 500,
    monthlyCostLimitCents: 5000,
  },
};
