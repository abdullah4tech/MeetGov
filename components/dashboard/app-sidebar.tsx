"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Video,
  CheckSquare,
  BarChart3,
  MessageSquare,
  Settings,
  Users,
  Building2,
  Bell,
  FileText,
  LogOut,
  ChevronUp,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type UserRole = "ADMIN" | "ORGANIZER" | "ASSIGNEE";
export type UserType = "personal" | "enterprise";

export interface SidebarUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  userType: UserType;
  enterprise?: {
    id: string;
    name: string;
    role: UserRole;
  } | null;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

function getPersonalNavigation(): NavGroup[] {
  return [
    {
      label: "Main",
      items: [
        { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { title: "Meetings", href: "/dashboard/meetings", icon: Video },
        { title: "Tasks", href: "/dashboard/tasks", icon: CheckSquare },
        { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
        { title: "AI Assistant", href: "/dashboard/assistant", icon: MessageSquare },
      ],
    },
    {
      label: "Settings",
      items: [
        { title: "Profile", href: "/dashboard/profile", icon: Settings },
      ],
    },
  ];
}

function getEnterpriseNavigation(role: UserRole): NavGroup[] {
  const baseItems: NavItem[] = [
    { title: "Dashboard", href: "/dashboard/enterprise", icon: LayoutDashboard },
  ];

  // Admin and Organizer can see meetings
  if (role === "ADMIN" || role === "ORGANIZER") {
    baseItems.push({ title: "Meetings", href: "/dashboard/enterprise/meetings", icon: Video });
  }

  // All roles see their tasks (My Tasks for participants)
  baseItems.push({ 
    title: role === "ASSIGNEE" ? "My Tasks" : "Tasks", 
    href: "/dashboard/enterprise/tasks", 
    icon: CheckSquare 
  });

  // Only Admin and Organizer see Analytics
  if (role === "ADMIN" || role === "ORGANIZER") {
    baseItems.push({ title: "Analytics", href: "/dashboard/enterprise/analytics", icon: BarChart3 });
  }

  // Participants see their submissions
  if (role === "ASSIGNEE") {
    baseItems.push({ title: "Submissions", href: "/dashboard/enterprise/submissions", icon: FileText });
    baseItems.push({ title: "Notifications", href: "/dashboard/enterprise/notifications", icon: Bell });
  }

  // Participants see "My Meetings" instead of full Meetings page
  if (role === "ASSIGNEE") {
    // Insert My Meetings after Dashboard
    baseItems.splice(1, 0, { title: "My Meetings", href: "/dashboard/enterprise/my-meetings", icon: Video });
  }

  // AI Assistant for all roles
  baseItems.push({ title: "AI Assistant", href: "/dashboard/enterprise/assistant", icon: MessageSquare });

  const groups: NavGroup[] = [
    {
      label: "Main",
      items: baseItems,
    },
  ];

  // Admin-only management section
  if (role === "ADMIN") {
    groups.push({
      label: "Management",
      items: [
        { title: "Members", href: "/dashboard/enterprise/members", icon: Users },
        { title: "Organization", href: "/dashboard/enterprise/settings", icon: Building2 },
      ],
    });
  }

  // Settings group for all
  groups.push({
    label: "Settings",
    items: [
      { title: "Profile", href: "/dashboard/enterprise/profile", icon: Settings },
    ],
  });

  return groups;
}

interface AppSidebarProps {
  user: SidebarUser;
  onSignOut: () => void;
}

export function AppSidebar({ user, onSignOut }: AppSidebarProps) {
  const pathname = usePathname();

  const navigation = React.useMemo(() => {
    if (user.userType === "enterprise" && user.enterprise) {
      return getEnterpriseNavigation(user.enterprise.role);
    }
    return getPersonalNavigation();
  }, [user.userType, user.enterprise]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const isActive = (href: string) => {
    if (href === "/dashboard" || href === "/dashboard/enterprise") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const appName = user.userType === "enterprise" ? user.enterprise?.name || "Enterprise" : "MeetAssist";
  const appIcon = user.userType === "enterprise" ? Building2 : Video;
  const AppIcon = appIcon;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={user.userType === "enterprise" ? "/dashboard/enterprise" : "/dashboard"}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <AppIcon className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">{appName}</span>
                  {user.userType === "enterprise" && (
                    <span className="text-xs text-muted-foreground capitalize">
                      {user.enterprise?.role.toLowerCase()}
                    </span>
                  )}
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navigation.map((group, groupIndex) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
            {groupIndex < navigation.length - 1 && <SidebarSeparator className="mt-2" />}
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                    <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name || "User"}</span>
                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="top"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link href={user.userType === "enterprise" ? "/dashboard/enterprise/profile" : "/dashboard/profile"}>
                    <Settings className="mr-2 size-4" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 size-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
