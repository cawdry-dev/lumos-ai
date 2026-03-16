import "server-only";

import { Resend } from "resend";

/** Lazily initialised Resend client — avoids build-time errors when the env var is absent. */
function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set.");
  }
  return new Resend(apiKey);
}

/**
 * Sends an invitation email to a prospective user via Resend.
 *
 * The email contains a registration link with the invitation token,
 * details about who invited them, their assigned role, and expiry information.
 */
export async function sendInvitationEmail({
  to,
  inviterEmail,
  role,
  token,
  expiresAt,
  displayName,
}: {
  to: string;
  inviterEmail: string;
  role: string;
  token: string;
  expiresAt: Date;
  displayName?: string;
}) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const registrationUrl = `${appUrl}/register?token=${token}`;

  const expiresInDays = Math.ceil(
    (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const greeting = displayName
    ? `Hi ${displayName}, you've been invited!`
    : "You've been invited!";

  const { data, error } = await getResendClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "Lumos AI <noreply@example.com>",
    to,
    subject: "You've been invited to Lumos AI",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">${greeting}</h2>
        <p>
          <strong>${inviterEmail}</strong> has invited you to join
          <strong>Lumos AI</strong> as ${role === "admin" ? "an" : "a"}
          <strong>${role}</strong>.
        </p>
        <p>
          Click the button below to create your account:
        </p>
        <p style="text-align: center; margin: 30px 0;">
          <a
            href="${registrationUrl}"
            style="
              background-color: #0070f3;
              color: #fff;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
            "
          >
            Accept Invitation
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link into your browser:<br />
          <a href="${registrationUrl}" style="color: #0070f3;">${registrationUrl}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">
          This invitation expires in ${expiresInDays} day${expiresInDays !== 1 ? "s" : ""}.
          If you did not expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send invitation email: ${error.message}`);
  }

  return data;
}

