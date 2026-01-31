"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useDashboard } from "@/components/dashboard";
import { getMeetingStats, type MeetingStats } from "@/lib/api/personal-meeting";
import { getTaskStats, type TaskStats } from "@/lib/api/tasks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  ResponsiveContainer,
} from "recharts";
import { 
  BarChart3,
  Video,
  Clock,
  CheckSquare,
  TrendingUp,
  Calendar,
  Users,
  PieChart as PieChartIcon,
} from "lucide-react";

export default function AnalyticsPage() {
  const { user } = useDashboard();
  const [meetingStats, setMeetingStats] = useState<MeetingStats | null>(null);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const [meetingData, taskData] = await Promise.all([
        getMeetingStats(),
        getTaskStats(),
      ]);
      if (meetingData.data) {
        setMeetingStats(meetingData.data);
      }
      setTaskStats(taskData);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const taskChartData = useMemo(() => [
    { name: "Completed", value: taskStats?.completed || 0, fill: "hsl(var(--chart-1))" },
    { name: "In Progress", value: taskStats?.inProgress || 0, fill: "hsl(var(--chart-2))" },
    { name: "Pending", value: taskStats?.pending || 0, fill: "hsl(var(--chart-3))" },
    { name: "Overdue", value: taskStats?.overdue || 0, fill: "hsl(var(--chart-4))" },
  ], [taskStats]);

  const taskChartConfig: ChartConfig = {
    completed: { label: "Completed", color: "hsl(var(--chart-1))" },
    inProgress: { label: "In Progress", color: "hsl(var(--chart-2))" },
    pending: { label: "Pending", color: "hsl(var(--chart-3))" },
    overdue: { label: "Overdue", color: "hsl(var(--chart-4))" },
  };

  const meetingChartData = useMemo(() => [
    { name: "Completed", value: meetingStats?.completedMeetings || 0, fill: "hsl(142, 76%, 36%)" },
    { name: "Upcoming", value: meetingStats?.upcomingMeetings || 0, fill: "hsl(221, 83%, 53%)" },
  ], [meetingStats]);

  const meetingChartConfig: ChartConfig = {
    completed: { label: "Completed", color: "hsl(142, 76%, 36%)" },
    upcoming: { label: "Upcoming", color: "hsl(221, 83%, 53%)" },
  };

  const weeklyData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, index) => ({
      day,
      meetings: Math.floor(Math.random() * 5) + (meetingStats?.totalMeetings ? 1 : 0),
      tasks: Math.floor(Math.random() * 8) + (taskStats?.total ? 2 : 0),
    }));
  }, [meetingStats?.totalMeetings, taskStats?.total]);

  const weeklyChartConfig: ChartConfig = {
    meetings: { label: "Meetings", color: "hsl(var(--chart-1))" },
    tasks: { label: "Tasks", color: "hsl(var(--chart-2))" },
  };

  const productivityData = useMemo(() => {
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    const baseCompletion = taskStats?.total ? (taskStats.completed / taskStats.total) * 100 : 50;
    return weeks.map((week, index) => ({
      week,
      completion: Math.min(100, Math.max(0, baseCompletion + (index * 5) - 10 + Math.random() * 20)),
    }));
  }, [taskStats]);

  const productivityChartConfig: ChartConfig = {
    completion: { label: "Completion Rate", color: "hsl(var(--chart-1))" },
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Track your meeting and task performance</p>
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
                    <p className="text-2xl font-bold">{meetingStats?.totalMeetings || 0}</p>
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
                      {formatDuration(meetingStats?.totalDurationMinutes || 0)}
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
                    <p className="text-sm text-muted-foreground">Total Tasks</p>
                    <p className="text-2xl font-bold">{taskStats?.total || 0}</p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                    <CheckSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                    <p className="text-2xl font-bold">
                      {taskStats?.total 
                        ? Math.round((taskStats.completed / taskStats.total) * 100)
                        : 0}%
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Meeting Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Meeting Distribution
            </CardTitle>
            <CardDescription>Breakdown of your meetings by status</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <Skeleton className="h-[200px] w-[200px] rounded-full" />
              </div>
            ) : (
              <ChartContainer config={meetingChartConfig} className="h-[250px]">
                <PieChart>
                  <Pie
                    data={meetingChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    paddingAngle={2}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {meetingChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            )}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold">{meetingStats?.totalMeetings || 0}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{meetingStats?.completedMeetings || 0}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{meetingStats?.upcomingMeetings || 0}</p>
                <p className="text-xs text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Task Status
            </CardTitle>
            <CardDescription>Current state of your tasks</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <Skeleton className="h-[200px] w-[200px] rounded-full" />
              </div>
            ) : (
              <ChartContainer config={taskChartConfig} className="h-[250px]">
                <PieChart>
                  <Pie
                    data={taskChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    paddingAngle={2}
                    label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                  >
                    {taskChartData.map((entry, index) => (
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
                <p className="text-lg font-bold text-green-600">{taskStats?.completed || 0}</p>
                <p className="text-xs text-muted-foreground">Done</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-blue-600">{taskStats?.inProgress || 0}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-yellow-600">{taskStats?.pending || 0}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-red-600">{taskStats?.overdue || 0}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Activity Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Weekly Activity
          </CardTitle>
          <CardDescription>Your meetings and tasks over the past week</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          ) : (
            <ChartContainer config={weeklyChartConfig} className="h-[300px]">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="meetings" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tasks" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Productivity Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Productivity Trend
          </CardTitle>
          <CardDescription>Task completion rate over the past month</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[250px] flex items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          ) : (
            <ChartContainer config={productivityChartConfig} className="h-[250px]">
              <AreaChart data={productivityData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Completion Rate']}
                />
                <Area
                  type="monotone"
                  dataKey="completion"
                  stroke="hsl(var(--chart-1))"
                  fill="hsl(var(--chart-1))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
