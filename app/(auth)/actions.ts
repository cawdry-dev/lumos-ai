"use server";

import { z } from "zod";

import {
  createProfile,
  getInvitationByToken,
  getUserCount,
  markInvitationAccepted,
} from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginActionState = {
  status: "idle" | "in_progress" | "success" | "failed" | "invalid_data";
};

export const login = async (
  _: LoginActionState,
  formData: FormData
): Promise<LoginActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    });

    if (error) {
      return { status: "failed" };
    }

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    return { status: "failed" };
  }
};

export type RegisterActionState = {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "failed"
    | "user_exists"
    | "invalid_data"
    | "invalid_token";
};

export const register = async (
  _: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const token = formData.get("token") as string | null;

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
    });

    if (error) {
      // Supabase returns a specific message when the user already exists
      if (error.message?.toLowerCase().includes("already registered")) {
        return { status: "user_exists" };
      }
      return { status: "failed" };
    }

    const userId = data.user?.id;
    if (!userId) {
      return { status: "failed" };
    }

    // First user becomes admin automatically; subsequent users require a valid invitation
    const existingUserCount = await getUserCount();

    if (existingUserCount === 0) {
      await createProfile({
        id: userId,
        email: validatedData.email,
        role: "admin",
      });
    } else {
      if (!token) {
        return { status: "invalid_token" };
      }

      const inv = await getInvitationByToken(token);
      if (!inv) {
        return { status: "invalid_token" };
      }

      await createProfile({
        id: userId,
        email: validatedData.email,
        role: inv.role,
        invitedBy: inv.invitedBy,
      });

      await markInvitationAccepted(token);
    }

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    return { status: "failed" };
  }
};
