import type { UserType } from "@/lib/supabase/auth";

type Entitlements = {
  maxMessagesPerHour: number;
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /** Entitlements for admin users. */
  admin: {
    maxMessagesPerHour: 100,
  },

  /** Entitlements for editor users. */
  editor: {
    maxMessagesPerHour: 100,
  },
};
