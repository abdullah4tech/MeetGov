"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/components/dashboard";
import { getEnterpriseMembers, type GetMembersResponse } from "@/lib/api/enterprise";
import {
  getDashboardData,
  getAnalyticsSummary,
  getMeetingStats,
  type DashboardData,
  type ParticipantDashboardData,
  type OrganizationStats,
  type MeetingStatsByPeriod,
  type EnterpriseRole,
} from "@/lib/api/enterprise-analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Video, 
  Calendar, 
  FileText, 
  Plus,
  Users,
  UserPlus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Activity
} from "lucide-react";

export default function EnterpriseDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useDashboard();
  const [membersData, setMembersData] = useState<GetMembersResponse | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | ParticipantDashboardData | null>(null);
  const [analyticsStats, setAnalyticsStats] = useState<OrganizationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshDashboard = useCallback(async () => {
    if (!user?.enterprise?.id) return;
    try {
      const response = await getDashboardData();
      setDashboardData(response.data);
    } catch (err) {
      console.error("Failed to refresh dashboard:", err);
    }
  }, [user?.enterprise?.id]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.enterprise) return;

      try {
        // Fetch dashboard data
        const dashResponse = await getDashboardData();
        setDashboardData(dashResponse.data);

        // Fetch members and analytics if admin or organizer
        if (user.enterprise.role === "ADMIN" || user.enterprise.role === "ORGANIZER") {
          const [members, analytics] = await Promise.all([
            getEnterpriseMembers(),
            getAnalyticsSummary(),
          ]);
          setMembersData(members);
          setAnalyticsStats(analytics);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      case "ORGANIZER":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const canManageMembers = user?.enterprise?.role === "ADMIN" || user?.enterprise?.role === "ORGANIZER";

  return (
    <div>
      {/* Welcome section */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {user?.name?.split(" ")[0] || "there"}!
          </h1>
          <p className="text-muted-foreground">
            {canManageMembers 
              ? "Manage your organization's meetings, team members, and analytics."
              : "View your assigned tasks and upcoming meetings."}
          </p>
        </div>
      </div>

      {/* Analytics Cards - Admin/Organizer only */}
      {canManageMembers && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" role="region" aria-label="Analytics Overview">
          {isLoading ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Meetings</p>
                        <p className="text-2xl font-bold">{analyticsStats?.totalMeetings || 0}</p>
                      </div>
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                        <Video className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Completed Tasks</p>
                        <p className="text-2xl font-bold">{analyticsStats?.completedTasks || 0}</p>
                      </div>
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Pending Tasks</p>
                        <p className="text-2xl font-bold">{analyticsStats?.pendingTasks || 0}</p>
                      </div>
                      <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                        <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Team Members</p>
                        <p className="text-2xl font-bold">{analyticsStats?.totalMembers || 0}</p>
                      </div>
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                        <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assigned Tasks */}
          <Card className="lg:col-span-2" role="region" aria-label="Assigned Tasks">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {canManageMembers ? "Tasks Overview" : "My Tasks"}
                </CardTitle>
                <CardDescription>
                  {dashboardData && 'assignedTasks' in dashboardData
                    ? `${dashboardData.assignedTasks.length} active task${dashboardData.assignedTasks.length !== 1 ? 's' : ''}`
                    : 'Loading...'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {!dashboardData ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Skeleton className="h-4 w-4" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-3/4 mb-1" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : dashboardData.assignedTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No active tasks</p>
                  <p className="text-sm">You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardData.assignedTasks.slice(0, 5).map((task) => (
                    <div 
                      key={task.id} 
                      className={`flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors ${task.isOverdue ? 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-900/10' : ''}`}
                      role="article"
                      aria-label={`Task: ${task.title}`}
                    >
                      <div className={`mt-1 ${task.isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {task.isOverdue ? <AlertCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.meetingTitle} • {task.priority}
                          {task.dueDate && ` • Due ${new Date(task.dueDate).toLocaleDateString()}`}
                        </p>
                      </div>
                      <Badge variant={task.status === 'COMPLETED' ? 'default' : 'secondary'} className="shrink-0">
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                  {dashboardData.assignedTasks.length > 5 && (
                    <Button variant="link" className="w-full" size="sm">
                      View all {dashboardData.assignedTasks.length} tasks
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Meetings */}
          <Card role="region" aria-label="Upcoming Meetings">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Meetings
              </CardTitle>
              <CardDescription>Your scheduled meetings</CardDescription>
            </CardHeader>
            <CardContent>
              {!dashboardData ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-3 border rounded-lg">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : dashboardData.upcomingMeetings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No upcoming meetings</p>
                  {canManageMembers && (
                    <Button className="mt-4" size="sm" onClick={() => router.push("/create-meeting")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule Meeting
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardData.upcomingMeetings.slice(0, 4).map((meeting) => (
                    <div 
                      key={meeting.id} 
                      className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      role="article"
                      aria-label={`Meeting: ${meeting.title}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{meeting.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {meeting.scheduledStart 
                              ? new Date(meeting.scheduledStart).toLocaleString()
                              : 'Not scheduled'}
                          </p>
                        </div>
                        {meeting.isOwner && (
                          <Badge variant="outline" className="shrink-0 ml-2">Organizer</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Team members section - Admin/Organizer only */}
        {canManageMembers && membersData && (
          <Card className="mt-6" role="region" aria-label="Team Members">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members
                </CardTitle>
                <CardDescription>
                  {membersData.members.length} member{membersData.members.length !== 1 ? "s" : ""}
                  {membersData.pendingInvites.length > 0 && (
                    <span>, {membersData.pendingInvites.length} pending</span>
                  )}
                </CardDescription>
              </div>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {membersData.members.slice(0, 5).map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.image || undefined} />
                            <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeStyle(member.role)}`}>
                          {member.role === "ASSIGNEE" ? "Participant" : member.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {membersData.pendingInvites.slice(0, 3).map((invite) => (
                    <TableRow key={invite.id} className="opacity-60">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>?</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-muted-foreground">Pending</p>
                            <p className="text-xs text-muted-foreground">{invite.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeStyle(invite.role)}`}>
                          {invite.role === "ASSIGNEE" ? "Participant" : invite.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Pending
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {(membersData.members.length > 5 || membersData.pendingInvites.length > 3) && (
                <div className="mt-4 text-center">
                  <Button variant="link" size="sm">View all members</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        {dashboardData && dashboardData.recentActivity.length > 0 && (
          <Card className="mt-6" role="region" aria-label="Recent Activity">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest updates in your organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-2">
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
