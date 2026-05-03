/**
 * POST /api/personal/meetings — Create a personal (authenticated) meeting
 * GET  /api/personal/meetings — List personal meetings
 *
 * Delegates to /api/v1/meetings under the hood.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const DATA_RETENTION_DAYS = 30; // Personal users get longer retention

function generateJoinCode(length = 8): string {
  return crypto.randomBytes(length).toString("hex").toUpperCase().slice(0, length);
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { title, meetingType, scheduledAt, durationMinutes, participants, location } = body;

    if (!title || !meetingType || !durationMinutes) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Ensure user exists in DB (create on first use)
    const clerkUser = await currentUser();
    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        name: `${clerkUser?.firstName ?? ""} ${clerkUser?.lastName ?? ""}`.trim() || null,
        email: clerkUser?.emailAddresses[0]?.emailAddress ?? "",
        image: clerkUser?.imageUrl ?? null,
        emailVerified: clerkUser?.emailAddresses[0]?.verification?.status === "verified",
      },
      update: {},
    });

    const scheduledStart = scheduledAt ? new Date(scheduledAt) : new Date();
    const scheduledEnd = new Date(scheduledStart.getTime() + durationMinutes * 60 * 1000);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DATA_RETENTION_DAYS);

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
        ownerId: userId,
        ownerType: "PERSONAL",
        participants: { create: participantData },
      },
      include: { participants: true },
    });

    const inviteResults = participantData.map((p) => ({
      email: p.email,
      success: false,
      reason: "Email service not configured",
    }));

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
    console.error("[POST /api/personal/meetings]", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "10")));

    const [meetings, total] = await Promise.all([
      prisma.meeting.findMany({
        where: { ownerId: userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { participants: true },
      }),
      prisma.meeting.count({ where: { ownerId: userId } }),
    ]);

    return NextResponse.json({
      meetings,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: any) {
    console.error("[GET /api/personal/meetings]", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
