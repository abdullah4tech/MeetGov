"use client";

import { DashboardProvider } from "@/components/dashboard";

export default function EnterpriseDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProvider requireEnterprise>
      {children}
    </DashboardProvider>
  );
}
