/**
 * POST /api/v1/guest/workflow/start — Guest session initialization
 * No backend required — returns a local token that lets guests use the form.
 */
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST() {
  const token = crypto.randomBytes(16).toString("hex");
  const workflowId = `guest-${Date.now()}`;
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

  return NextResponse.json({
    guestSessionToken: token,
    workflowId,
    expiresAt: expiresAt.toISOString(),
    workflowAllowed: true,
    guestInfo: {
      id: token,
      remainingMeetings: 1,
    },
  });
}
