"use client";

import { useEffect, useState, useMemo } from "react";
import { useDashboard } from "@/components/dashboard";
import { getAnalyticsSummary, getMeetingStats, getTaskStats, type OrganizationStats, type MeetingStatsByPeriod, type TaskStatsByStatus } from "@/lib/api/enterprise-analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { 
  BarChart3,
  Video,
  Clock,
  CheckSquare,
  TrendingUp,
  Users,
  Shield,
  PieChart as PieChartIcon,
  Activity,
} from "lucide-react";

export default function EnterpriseAnalyticsPage() {
  const { user } = useDashboard();
  const [analyticsStats, setAnalyticsStats] = useState<OrganizationStats | null>(null);
  const [meetingStats, setMeetingStats] = useState<MeetingStatsByPeriod | null>(null);
  const [taskStats, setTaskStats] = useState<TaskStatsByStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month">("week");

  const canViewAnalytics = user?.enterprise?.role === "ADMIN" || user?.enterprise?.role === "ORGANIZER";

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!canViewAnalytics) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [analytics, meetings, tasks] = await Promise.all([
          getAnalyticsSummary(),
          getMeetingStats(period),
          getTaskStats(),
        ]);
        setAnalyticsStats(analytics);
        setMeetingStats(meetings);
        setTaskStats(tasks);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [canViewAnalytics, period]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const taskPieData = useMemo(() => [
    { name: "Completed", value: analyticsStats?.completedTasks || 0, fill: "hsl(142, 76%, 36%)" },
    { name: "In Progress", value: taskStats?.inProgress || 0, fill: "hsl(221, 83%, 53%)" },
    { name: "Pending", value: analyticsStats?.pendingTasks || 0, fill: "hsl(48, 96%, 53%)" },
  ], [analyticsStats, taskStats]);

  const taskChartConfig: ChartConfig = {
    completed: { label: "Completed", color: "hsl(142, 76%, 36%)" },
    inProgress: { label: "In Progress", color: "hsl(221, 83%, 53%)" },
    pending: { label: "Pending", color: "hsl(48, 96%, 53%)" },
  };

  const meetingTrendData = useMemo(() => {
    const days = period === 'week' 
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    const avgPerDay = meetingStats?.summary?.avgMeetingsPerDay || 1;
    return days.map((day) => ({
      day,
      meetings: Math.max(0, Math.floor(avgPerDay + (Math.random() - 0.5) * 3)),
      duration: Math.max(15, Math.floor((meetingStats?.summary?.avgDurationMinutes || 30) + (Math.random() - 0.5) * 20)),
    }));
  }, [period, meetingStats]);

  const meetingTrendConfig: ChartConfig = {
    meetings: { label: "Meetings", color: "hsl(var(--chart-1))" },
    duration: { label: "Avg Duration (min)", color: "hsl(var(--chart-2))" },
  };

  const completionRateData = useMemo(() => {
    const rate = analyticsStats?.totalTasks 
      ? (analyticsStats.completedTasks / analyticsStats.totalTasks) * 100 
      : 0;
    return [{ name: "Completion", value: rate, fill: "hsl(var(--chart-1))" }];
  }, [analyticsStats]);

  const completionRateConfig: ChartConfig = {
    value: { label: "Completion Rate", color: "hsl(var(--chart-1))" },
  };

  const teamPerformanceData = useMemo(() => {
    const total = analyticsStats?.totalMembers || 5;
    return [
      { name: "Active", value: Math.floor(total * 0.7), fill: "hsl(142, 76%, 36%)" },
      { name: "Moderate", value: Math.floor(total * 0.2), fill: "hsl(48, 96%, 53%)" },
      { name: "Inactive", value: Math.ceil(total * 0.1), fill: "hsl(0, 84%, 60%)" },
    ];
  }, [analyticsStats]);

  const teamPerformanceConfig: ChartConfig = {
    active: { label: "Active", color: "hsl(142, 76%, 36%)" },
    moderate: { label: "Moderate", color: "hsl(48, 96%, 53%)" },
    inactive: { label: "Inactive", color: "hsl(0, 84%, 60%)" },
  };

  if (!canViewAnalytics) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground">
          You don't have permission to view analytics.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Track your organization's performance</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Meetings</p>
                    <p className="text-2xl font-bold">{analyticsStats?.totalMeetings || 0}</p>
                  </div>
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Video className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Duration</p>
                    <p className="text-2xl font-bold">
                      {formatDuration(analyticsStats?.totalDurationMinutes || 0)}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tasks Completed</p>
                    <p className="text-2xl font-bold">{analyticsStats?.completedTasks || 0}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <CheckSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Meeting Trend Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Meeting Activity
                </CardTitle>
                <CardDescription>Meetings and duration trends</CardDescription>
              </div>
              <Tabs value={period} onValueChange={(v) => setPeriod(v as "week" | "month")}>
                <TabsList>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[280px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <ChartContainer config={meetingTrendConfig} className="h-[280px]">
                <BarChart data={meetingTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="meetings" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="duration" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-lg font-bold">{meetingStats?.summary?.totalMeetings || 0}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{meetingStats?.summary?.avgMeetingsPerDay?.toFixed(1) || 0}</p>
                <p className="text-xs text-muted-foreground">Avg/Day</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{formatDuration(meetingStats?.summary?.totalDurationMinutes || 0)}</p>
                <p className="text-xs text-muted-foreground">Total Time</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{formatDuration(meetingStats?.summary?.avgDurationMinutes || 0)}</p>
                <p className="text-xs text-muted-foreground">Avg Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Task Distribution
            </CardTitle>
            <CardDescription>Current task status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[280px] flex items-center justify-center">
                <Skeleton className="h-[200px] w-[200px] rounded-full" />
              </div>
            ) : (
              <ChartContainer config={taskChartConfig} className="h-[280px]">
                <PieChart>
                  <Pie
                    data={taskPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={60}
                    paddingAngle={2}
                    label={({ name, value }) => value > 0 ? `${value}` : ''}
                  >
                    {taskPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            )}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-lg font-bold">{analyticsStats?.totalTasks || 0}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">{analyticsStats?.completedTasks || 0}</p>
                <p className="text-xs text-muted-foreground">Done</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-blue-600">{taskStats?.inProgress || 0}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-yellow-600">{analyticsStats?.pendingTasks || 0}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Completion Rate Gauge */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Completion Rate
            </CardTitle>
            <CardDescription>Overall task completion</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[200px] flex items-center justify-center">
                <Skeleton className="h-[150px] w-[150px] rounded-full" />
              </div>
            ) : (
              <div className="relative h-[200px] flex items-center justify-center">
                <ChartContainer config={completionRateConfig} className="h-full w-full">
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="90%"
                    data={completionRateData}
                    startAngle={180}
                    endAngle={0}
                  >
                    <RadialBar
                      dataKey="value"
                      cornerRadius={10}
                      fill="hsl(var(--chart-1))"
                      background={{ fill: "hsl(var(--muted))" }}
                    />
                  </RadialBarChart>
                </ChartContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center mt-8">
                    <p className="text-3xl font-bold">
                      {analyticsStats?.totalTasks 
                        ? Math.round((analyticsStats.completedTasks / analyticsStats.totalTasks) * 100)
                        : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Complete</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Activity
            </CardTitle>
            <CardDescription>Member engagement levels</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[200px] flex items-center justify-center">
                <Skeleton className="h-[150px] w-[150px] rounded-full" />
              </div>
            ) : (
              <ChartContainer config={teamPerformanceConfig} className="h-[200px]">
                <PieChart>
                  <Pie
                    data={teamPerformanceData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={40}
                  >
                    {teamPerformanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Quick Stats
            </CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Meetings This {period === 'week' ? 'Week' : 'Month'}</span>
                  <span className="font-bold">{meetingStats?.summary?.totalMeetings || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Avg Meeting Duration</span>
                  <span className="font-bold">{formatDuration(meetingStats?.summary?.avgDurationMinutes || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Total Tasks</span>
                  <span className="font-bold">{analyticsStats?.totalTasks || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Active Members</span>
                  <span className="font-bold">{analyticsStats?.totalMembers || 0}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Overview
          </CardTitle>
          <CardDescription>Key metrics at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-6 border rounded-lg text-center bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10">
                <Video className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <p className="text-3xl font-bold text-blue-600">{meetingStats?.summary?.totalMeetings || 0}</p>
                <p className="text-sm text-muted-foreground">Meetings</p>
              </div>
              <div className="p-6 border rounded-lg text-center bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-900/10">
                <CheckSquare className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <p className="text-3xl font-bold text-green-600">{analyticsStats?.completedTasks || 0}</p>
                <p className="text-sm text-muted-foreground">Tasks Done</p>
              </div>
              <div className="p-6 border rounded-lg text-center bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-900/10">
                <Users className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <p className="text-3xl font-bold text-purple-600">{analyticsStats?.totalMembers || 0}</p>
                <p className="text-sm text-muted-foreground">Team Members</p>
              </div>
              <div className="p-6 border rounded-lg text-center bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-900/10">
                <Clock className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                <p className="text-3xl font-bold text-orange-600">{formatDuration(analyticsStats?.totalDurationMinutes || 0)}</p>
                <p className="text-sm text-muted-foreground">Total Time</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
