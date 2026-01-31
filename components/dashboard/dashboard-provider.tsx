"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
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
  const { data: session, isPending: isSessionLoading } = useSession();
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

        // Check role-based access
        if (allowedRoles && !allowedRoles.includes(userInfo.enterprise.role)) {
          router.push("/dashboard/enterprise");
          return;
        }
      } else {
        // Personal dashboard - redirect enterprise users
        if (userInfo.userType === "enterprise" && userInfo.enterprise) {
          router.push("/dashboard/enterprise");
          return;
        }
      }
    } catch (err) {
      console.error("Failed to fetch user:", err);
      router.push("/auth/signin");
    } finally {
      setIsLoading(false);
    }
  }, [router, requireEnterprise, allowedRoles]);

  React.useEffect(() => {
    if (!session?.user) {
      if (!isSessionLoading) {
        const signInPath = requireEnterprise ? "/auth/signin?type=enterprise" : "/auth/signin";
        router.push(signInPath);
      }
      return;
    }

    fetchUser();
  }, [session, isSessionLoading, router, fetchUser, requireEnterprise]);

  const refreshUser = React.useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  // Loading state
  if (isSessionLoading || isLoading) {
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
