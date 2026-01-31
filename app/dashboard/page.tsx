"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/components/dashboard";
import { 
  listPersonalMeetings, 
  deletePersonalMeeting,
  getMeetingStats,
  type MeetingListItem,
  type MeetingStats,
  getStatusDisplay,
  getStatusColor,
} from "@/lib/api/personal-meeting";
import { getMyTasks, getTaskStats, type Task, type TaskStats } from "@/lib/api/tasks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreateMeetingModal } from "@/components/create-meeting-modal";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Video, 
  Calendar, 
  Plus,
  Users,
  Trash2,
  Eye,
  Play,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckSquare,
  Clock,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

export default function PersonalDashboardPage() {
  const router = useRouter();
  const { user } = useDashboard();
  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 0 });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<MeetingListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [meetingStats, setMeetingStats] = useState<MeetingStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const { toast } = useToast();

  const fetchMeetings = useCallback(async (page: number = 1) => {
    setMeetingsLoading(true);
    try {
      const { data, error } = await listPersonalMeetings(page, 10);
      if (data && !error) {
        setMeetings(data.meetings);
        setPagination({
          page: data.page,
          pageSize: data.pageSize,
          total: data.total,
          totalPages: data.totalPages,
        });
      }
    } catch (err) {
      console.error("Failed to fetch meetings:", err);
    } finally {
      setMeetingsLoading(false);
    }
  }, []);

  const fetchTaskStats = useCallback(async () => {
    try {
      const [tasksData, statsData] = await Promise.all([
        getMyTasks({ limit: 5 }),
        getTaskStats(),
      ]);
      setTasks(tasksData);
      setTaskStats(statsData);
    } catch (err) {
      console.error("Failed to fetch task stats:", err);
    }
  }, []);

  const fetchMeetingStats = useCallback(async () => {
    try {
      const { data } = await getMeetingStats();
      if (data) {
        setMeetingStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch meeting stats:", err);
    }
  }, []);

  const fetchAllStats = useCallback(async () => {
    setStatsLoading(true);
    await Promise.all([fetchTaskStats(), fetchMeetingStats()]);
    setStatsLoading(false);
  }, [fetchTaskStats, fetchMeetingStats]);

  useEffect(() => {
    fetchMeetings();
    fetchAllStats();
  }, [fetchMeetings, fetchAllStats]);

  const handleDeleteMeeting = async () => {
    if (!meetingToDelete) return;
    setIsDeleting(true);
    try {
      const { success } = await deletePersonalMeeting(meetingToDelete.id);
      if (success) {
        fetchMeetings(pagination.page);
      }
    } catch (err) {
      console.error("Failed to delete meeting:", err);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setMeetingToDelete(null);
    }
  };

  const confirmDelete = (meeting: MeetingListItem) => {
    setMeetingToDelete(meeting);
    setDeleteDialogOpen(true);
  };

  const canJoin = (status: string) => ['LIVE', 'ACTIVE', 'WAITING', 'SCHEDULED'].includes(status);

  return (
    <div>
      {/* Welcome section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.name?.split(" ")[0] || "there"}!
        </h1>
        <p className="text-muted-foreground">
          Manage your meetings and access AI-powered notes and transcriptions.
        </p>
      </div>

        {/* Analytics Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" role="region" aria-label="Dashboard statistics">
          {statsLoading ? (
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
                      <p className="text-2xl font-bold">{meetingStats?.totalMeetings || 0}</p>
                    </div>
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center" aria-hidden="true">
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
                        {meetingStats?.totalDurationMinutes 
                          ? `${Math.floor(meetingStats.totalDurationMinutes / 60)}h ${meetingStats.totalDurationMinutes % 60}m`
                          : '0h 0m'}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center" aria-hidden="true">
                      <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Completed Tasks</p>
                      <p className="text-2xl font-bold">{taskStats?.completed || 0}</p>
                    </div>
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center" aria-hidden="true">
                      <CheckSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Tasks</p>
                      <p className="text-2xl font-bold">
                        {(taskStats?.pending || 0) + (taskStats?.inProgress || 0)}
                        {(taskStats?.overdue || 0) > 0 && (
                          <span className="text-sm font-normal text-red-500 ml-2">({taskStats?.overdue} overdue)</span>
                        )}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center" aria-hidden="true">
                      <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Task Overview Card */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" aria-hidden="true" />
                Task Overview
              </CardTitle>
              <CardDescription>
                {taskStats ? `${taskStats.total} total tasks` : 'Your assigned and created tasks'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                    <Skeleton className="h-8 w-8 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-48 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckSquare className="h-10 w-10 mx-auto mb-3 opacity-50" aria-hidden="true" />
                <p>No tasks yet</p>
                <p className="text-sm">Tasks from your meetings will appear here</p>
              </div>
            ) : (
              <div className="space-y-3" role="list" aria-label="Recent tasks">
                {tasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    role="listitem"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded flex items-center justify-center ${
                        task.status === 'COMPLETED' ? 'bg-green-100 dark:bg-green-900/30' :
                        task.status === 'IN_PROGRESS' ? 'bg-blue-100 dark:bg-blue-900/30' :
                        'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        <CheckSquare className={`h-4 w-4 ${
                          task.status === 'COMPLETED' ? 'text-green-600 dark:text-green-400' :
                          task.status === 'IN_PROGRESS' ? 'text-blue-600 dark:text-blue-400' :
                          'text-gray-600 dark:text-gray-400'
                        }`} aria-hidden="true" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.meeting?.title || 'Unknown meeting'}
                          {task.dueDate && ` • Due ${format(new Date(task.dueDate), 'MMM d')}`}
                        </p>
                      </div>
                    </div>
                    <Badge className={`text-xs ${
                      task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      task.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Meetings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Meetings</CardTitle>
              <CardDescription>
                {pagination.total > 0 
                  ? `${pagination.total} meeting${pagination.total > 1 ? 's' : ''} total`
                  : 'Your meeting recordings and notes'}
              </CardDescription>
            </div>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Meeting
            </Button>
          </CardHeader>
          <CardContent>
            {meetingsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : meetings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No meetings yet</p>
                <p className="text-sm">Create your first meeting to get started</p>
                <Button className="mt-4" onClick={() => setCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Meeting
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {meetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        meeting.status === 'LIVE' || meeting.status === 'ACTIVE'
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : meeting.status === 'SCHEDULED' || meeting.status === 'WAITING'
                          ? 'bg-blue-100 dark:bg-blue-900/30'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        {meeting.status === 'LIVE' || meeting.status === 'ACTIVE' ? (
                          <Play className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : meeting.status === 'SCHEDULED' || meeting.status === 'WAITING' ? (
                          <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Video className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{meeting.title}</h4>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {meeting.participantCount}
                          </span>
                          <span>{meeting.durationMinutes} min</span>
                          {meeting.scheduledAt && (
                            <span>{format(new Date(meeting.scheduledAt), 'MMM d, h:mm a')}</span>
                          )}
                          {meeting.hasArtifacts && (
                            <span className="flex items-center gap-1 text-primary">
                              <Sparkles className="h-3 w-3" />
                              AI
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(meeting.status)}>
                        {getStatusDisplay(meeting.status)}
                      </Badge>
                      {canJoin(meeting.status) && (
                        <Button
                          size="sm"
                          onClick={() => router.push(`/meeting/${meeting.id}`)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Join
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/meeting/${meeting.id}`)}
                        aria-label={`View meeting: ${meeting.title}`}
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => confirmDelete(meeting)}
                        aria-label={`Delete meeting: ${meeting.title}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pagination.page <= 1}
                        onClick={() => fetchMeetings(pagination.page - 1)}
                        aria-label="Go to previous page"
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => fetchMeetings(pagination.page + 1)}
                        aria-label="Go to next page"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{meetingToDelete?.title}&rdquo;? This action cannot be undone.
              All recordings, transcripts, and AI artifacts will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMeeting}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Meeting Modal */}
      <CreateMeetingModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => {
          fetchMeetings(1);
        }}
      />
    </div>
  );
}
