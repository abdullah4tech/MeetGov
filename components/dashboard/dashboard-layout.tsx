"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar, type SidebarUser } from "./app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { NotificationBell } from "@/components/notification-bell";
import type { DashboardNotification } from "@/hooks/use-dashboard-notifications";

interface DashboardLayoutProps {
  user: SidebarUser;
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  notifications?: {
    items: DashboardNotification[];
    unreadCount: number;
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    onClear: () => void;
  };
}

export function DashboardLayout({
  user,
  children,
  breadcrumbs = [],
  notifications,
}: DashboardLayoutProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/signin");
  };

  const defaultBreadcrumb = user.userType === "enterprise" 
    ? { label: "Dashboard", href: "/dashboard/enterprise" }
    : { label: "Dashboard", href: "/dashboard" };

  const allBreadcrumbs = [defaultBreadcrumb, ...breadcrumbs];

  return (
    <SidebarProvider>
      <AppSidebar user={user} onSignOut={handleSignOut} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb className="flex-1">
            <BreadcrumbList>
              {allBreadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.label}>
                  <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
                    {index === allBreadcrumbs.length - 1 ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {index < allBreadcrumbs.length - 1 && (
                    <BreadcrumbSeparator className={index === 0 ? "hidden md:block" : ""} />
                  )}
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          {notifications && (
            <NotificationBell
              notifications={notifications.items}
              unreadCount={notifications.unreadCount}
              onMarkAsRead={notifications.onMarkAsRead}
              onMarkAllAsRead={notifications.onMarkAllAsRead}
              onClear={notifications.onClear}
            />
          )}
        </header>
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
