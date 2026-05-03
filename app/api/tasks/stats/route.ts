/**
 * GET /api/tasks/stats — Task statistics for the dashboard
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const where = { ownerId: userId, ownerType: "PERSONAL" as const };

    const [pending, inProgress, completed, total] = await Promise.all([
      prisma.task.count({ where: { ...where, status: "PENDING" } }),
      prisma.task.count({ where: { ...where, status: "IN_PROGRESS" } }),
      prisma.task.count({ where: { ...where, status: "COMPLETED" } }),
      prisma.task.count({ where }),
    ]);

    return NextResponse.json({
      stats: {
        pending,
        inProgress,
        completed,
        overdue: 0, // Calculated client-side based on dueDate
        total,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/tasks/stats]", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
