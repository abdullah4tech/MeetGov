/**
 * POST /api/v1/meetings — Create a meeting
 * GET  /api/v1/meetings — List meetings for current user
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const DATA_RETENTION_DAYS = 7;

function generateJoinCode(length = 8): string {
  return crypto.randomBytes(length).toString("hex").toUpperCase().slice(0, length);
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const body = await req.json();
    const { title, meetingType, scheduledAt, durationMinutes, participants, location } = body;

    // Validate required fields
    if (!title || !meetingType || !durationMinutes) {
      return NextResponse.json(
        { error: "Missing required fields: title, meetingType, and durationMinutes are required" },
        { status: 400 }
      );
    }
    if (!["INSTANT", "SCHEDULED"].includes(meetingType)) {
      return NextResponse.json({ error: "Invalid meetingType. Must be INSTANT or SCHEDULED" }, { status: 400 });
    }
    if (durationMinutes > 60) {
      return NextResponse.json({ error: "Duration cannot exceed 60 minutes" }, { status: 400 });
    }
    if (durationMinutes < 5) {
      return NextResponse.json({ error: "Duration must be at least 5 minutes" }, { status: 400 });
    }
    if (meetingType === "SCHEDULED" && !scheduledAt) {
      return NextResponse.json({ error: "Scheduled meetings require a scheduledAt date" }, { status: 400 });
    }

    const scheduledStart = scheduledAt ? new Date(scheduledAt) : new Date();
    const scheduledEnd = new Date(scheduledStart.getTime() + durationMinutes * 60 * 1000);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DATA_RETENTION_DAYS);

    // Build participant records
    const participantData: any[] = [];
    if (participants && Array.isArray(participants)) {
      for (const p of participants) {
        if (p.email) {
          participantData.push({
            email: p.email,
            name: p.name || null,
            token: crypto.randomBytes(16).toString("hex"),
            expiresAt,
          });
        }
      }
    }

    // Create meeting (with or without user account)
    const meeting = await prisma.meeting.create({
      data: {
        title,
        meetingType: meetingType as "INSTANT" | "SCHEDULED",
        status: meetingType === "INSTANT" ? "ACTIVE" : "SCHEDULED",
        joinCode: generateJoinCode(),
        scheduledAt: scheduledStart,
        scheduledEndAt: scheduledEnd,
        durationMinutes,
        location: location || null,
        expiresAt,
        // Attach to authenticated user if signed in
        ...(userId ? {
          ownerId: userId,
          ownerType: "PERSONAL",
        } : {
          ownerType: "GUEST",
        }),
        participants: {
          create: participantData,
        },
      },
      include: {
        participants: true,
      },
    });

    // Build invite result stub (emails require SendGrid — skip for now)
    const inviteResults = participantData.map((p) => ({ email: p.email, success: false, reason: "Email service not configured" }));

    return NextResponse.json({
      meeting: {
        id: meeting.id,
        title: meeting.title,
        meetingType: meeting.meetingType,
        status: meeting.status,
        joinCode: meeting.joinCode,
        scheduledAt: meeting.scheduledAt,
        scheduledEndAt: meeting.scheduledEndAt,
        durationMinutes: meeting.durationMinutes,
        location: meeting.location,
        createdAt: meeting.createdAt,
      },
      inviteResults,
    });
  } catch (error: any) {
    console.error("[POST /api/v1/meetings]", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const meetings = await prisma.meeting.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { participants: true },
    });

    return NextResponse.json({ meetings });
  } catch (error: any) {
    console.error("[GET /api/v1/meetings]", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
