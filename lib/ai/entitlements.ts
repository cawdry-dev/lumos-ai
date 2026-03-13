import type { UserType } from "@/lib/supabase/auth";

type Entitlements = {
  maxMessagesPerHour: number;
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerHour: 10,
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
