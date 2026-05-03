/**
 * GET /api/v1/users/me — Get current authenticated user profile
 */
import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Try to find user in our DB
    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        enterpriseMemberships: {
          include: { enterprise: true },
        },
      },
    });

    // If user doesn't exist yet in DB, create from Clerk data
    if (!user) {
      const clerkUser = await currentUser();
      if (!clerkUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      user = await prisma.user.create({
        data: {
          id: clerkUser.id,
          name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || null,
          email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
          image: clerkUser.imageUrl ?? null,
          emailVerified: clerkUser.emailAddresses[0]?.verification?.status === "verified",
        },
        include: {
          enterpriseMemberships: {
            include: { enterprise: true },
          },
        },
      });
    }

    const membership = user.enterpriseMemberships[0];
    const isEnterprise = !!membership;

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      userType: isEnterprise ? "enterprise" : "personal",
      enterprise: membership
        ? {
            id: membership.enterprise.id,
            name: membership.enterprise.name,
            domain: membership.enterprise.domain,
            role: membership.role,
          }
        : null,
      needsOnboarding: false,
    });
  } catch (error: any) {
    console.error("[GET /api/v1/users/me]", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
