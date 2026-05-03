"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { getCurrentUser, type UserInfo } from "@/lib/api/user";
import { useDashboardNotifications } from "@/hooks/use-dashboard-notifications";
import { DashboardLayout } from "./dashboard-layout";
import type { SidebarUser } from "./app-sidebar";
import { Loader2 } from "lucide-react";

interface DashboardProviderProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  requireEnterprise?: boolean;
  allowedRoles?: ("ADMIN" | "ORGANIZER" | "ASSIGNEE")[];
}

interface DashboardContextValue {
  user: UserInfo | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const DashboardContext = React.createContext<DashboardContextValue | null>(null);

export function useDashboard() {
  const context = React.useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}

export function DashboardProvider({
  children,
  breadcrumbs = [],
  requireEnterprise = false,
  allowedRoles,
}: DashboardProviderProps) {
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();
  const [user, setUser] = React.useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useDashboardNotifications({
    userId: user?.id,
    enabled: !!user,
  });

  const fetchUser = React.useCallback(async () => {
    try {
      const userInfo = await getCurrentUser();
      setUser(userInfo);

      // Handle routing based on user type
      if (requireEnterprise) {
        if (userInfo.userType !== "enterprise" || !userInfo.enterprise) {
          router.push("/dashboard");
          return;
        }
        if (allowedRoles && !allowedRoles.includes(userInfo.enterprise.role)) {
          router.push("/dashboard/enterprise");
          return;
        }
      } else {
        if (userInfo.userType === "enterprise" && userInfo.enterprise) {
          router.push("/dashboard/enterprise");
          return;
        }
      }
    } catch (err) {
      // Backend unavailable — fall back to Clerk user data so the page still renders.
      // Don't redirect to sign-in; the user IS authenticated (Clerk confirmed it).
      console.warn("Backend API unavailable, using Clerk session data as fallback.", err);
      if (clerkUser) {
        setUser({
          id: clerkUser.id,
          name: clerkUser.fullName ?? clerkUser.username ?? "",
          email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
          image: clerkUser.imageUrl ?? null,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          userType: "personal",
          enterprise: null,
          needsOnboarding: false,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [router, requireEnterprise, allowedRoles, clerkUser]);

  React.useEffect(() => {
    if (!isLoaded) return;
    if (!clerkUser) return; // Clerk middleware handles redirect
    fetchUser();
  }, [clerkUser, isLoaded, fetchUser]);

  const refreshUser = React.useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  // Loading state
  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated or no user
  if (!user) {
    return null;
  }

  // Convert UserInfo to SidebarUser
  const sidebarUser: SidebarUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    userType: user.userType,
    enterprise: user.enterprise,
  };

  const contextValue: DashboardContextValue = {
    user,
    isLoading,
    refreshUser,
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      <DashboardLayout
        user={sidebarUser}
        breadcrumbs={breadcrumbs}
        notifications={{
          items: notifications,
          unreadCount,
          onMarkAsRead: markAsRead,
          onMarkAllAsRead: markAllAsRead,
          onClear: clearNotifications,
        }}
      >
        {children}
      </DashboardLayout>
    </DashboardContext.Provider>
  );
}
