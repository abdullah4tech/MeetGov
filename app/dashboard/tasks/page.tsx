"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/components/dashboard";
import { getMyTasks, getTaskStats, type Task, type TaskStats } from "@/lib/api/tasks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckSquare,
  Clock,
  AlertCircle,
  Search,
  Filter,
  ArrowUpRight,
} from "lucide-react";
import { format } from "date-fns";

export default function TasksPage() {
  const router = useRouter();
  const { user } = useDashboard();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tasksData, statsData] = await Promise.all([
        getMyTasks({ limit: 100 }),
        getTaskStats(),
      ]);
      setTasks(tasksData);
      setTaskStats(statsData);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'SUBMITTED':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "pending") return matchesSearch && task.status === "PENDING";
    if (activeTab === "in_progress") return matchesSearch && task.status === "IN_PROGRESS";
    if (activeTab === "completed") return matchesSearch && task.status === "COMPLETED";
    return matchesSearch;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <p className="text-muted-foreground">Manage your assigned and created tasks</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                    <p className="text-sm text-muted-foreground">Total Tasks</p>
                    <p className="text-2xl font-bold">{taskStats?.total || 0}</p>
                  </div>
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <CheckSquare className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">{taskStats?.pending || 0}</p>
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
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <p className="text-2xl font-bold">{taskStats?.inProgress || 0}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <ArrowUpRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{taskStats?.completed || 0}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <CheckSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Tasks</CardTitle>
              <CardDescription>Tasks from your meetings</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Skeleton className="h-8 w-8 rounded" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-48 mb-2" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tasks found</p>
                  <p className="text-sm">
                    {searchQuery ? "Try adjusting your search" : "Tasks from your meetings will appear here"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/meeting/${task.meetingId}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          task.status === 'COMPLETED' ? 'bg-green-100 dark:bg-green-900/30' :
                          task.status === 'IN_PROGRESS' ? 'bg-blue-100 dark:bg-blue-900/30' :
                          'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          <CheckSquare className={`h-5 w-5 ${
                            task.status === 'COMPLETED' ? 'text-green-600 dark:text-green-400' :
                            task.status === 'IN_PROGRESS' ? 'text-blue-600 dark:text-blue-400' :
                            'text-gray-600 dark:text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <h4 className="font-medium">{task.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{task.meeting?.title || 'Unknown meeting'}</span>
                            {task.dueDate && (
                              <>
                                <span>•</span>
                                <span className={new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED' ? 'text-red-500' : ''}>
                                  Due {format(new Date(task.dueDate), 'MMM d, yyyy')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {task.priority && (
                          <Badge variant="outline" className="capitalize">
                            {task.priority.toLowerCase()}
                          </Badge>
                        )}
                        <Badge className={getStatusBadgeStyle(task.status)}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
