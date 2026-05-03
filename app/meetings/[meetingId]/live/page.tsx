"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client"; // shim
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getMeetingJoinInfo,
  getMyStatus,
  getAttendance,
  getMyTasks,
  uploadTaskFile,
  submitTask,
  type MeetingJoinInfo,
  type ParticipantStatus,
  type Attendee,
  type ParticipantTask,
} from "@/lib/api/participant";
import {
  Loader2,
  Video,
  Users,
  Clock,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Bell,
  X,
  File,
  LogOut,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

type Notification = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
};

export default function ParticipantLiveMeetingPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.meetingId as string;
  const { toast } = useToast();
  
  const { data: session, isPending: isSessionLoading } = useSession();
  
  const [isLoading, setIsLoading] = useState(true);
  const [meetingInfo, setMeetingInfo] = useState<MeetingJoinInfo | null>(null);
  const [participantStatus, setParticipantStatus] = useState<ParticipantStatus | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [tasks, setTasks] = useState<ParticipantTask[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Task submission state
  const [selectedTask, setSelectedTask] = useState<ParticipantTask | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [submissionNotes, setSubmissionNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WebSocket connection
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    const [infoResult, statusResult, attendanceResult, tasksResult] = await Promise.all([
      getMeetingJoinInfo(meetingId),
      getMyStatus(meetingId),
      getAttendance(meetingId),
      getMyTasks(meetingId),
    ]);

    if (infoResult.data) setMeetingInfo(infoResult.data);
    if (statusResult.data) setParticipantStatus(statusResult.data);
    if (attendanceResult.data) {
      setAttendees(attendanceResult.data.attendees);
      setAttendeeCount(attendanceResult.data.totalCount);
    }
    if (tasksResult.data) setTasks(tasksResult.data.tasks);

    if (infoResult.error) {
      setError(infoResult.error.message);
    }
  }, [meetingId]);

  // Initialize
  useEffect(() => {
    const init = async () => {
      if (isSessionLoading) return;

      if (!session?.user) {
        router.push(`/meetings/${meetingId}/join`);
        return;
      }

      await fetchData();
      setIsLoading(false);
    };

    init();
  }, [meetingId, session, isSessionLoading, router, fetchData]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!session?.user || isLoading) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/api/v1/ws';

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Authenticate
      ws.send(JSON.stringify({
        type: 'authenticate',
        userId: session.user.id,
      }));

      // Subscribe to meeting room as participant
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'meeting',
        meetingId,
        role: 'participant',
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'attendance:checked-in':
            setAttendeeCount(data.totalCount);
            if (data.attendee) {
              setAttendees((prev) => {
                const exists = prev.some((a) => a.name === data.attendee.name);
                if (exists) return prev;
                return [
                  {
                    id: Date.now().toString(),
                    name: data.attendee.name,
                    email: data.attendee.email,
                    checkedInAt: data.attendee.checkedInAt,
                  },
                  ...prev,
                ];
              });
            }
            break;

          case 'task:assigned':
            // Refresh tasks
            getMyTasks(meetingId).then((result) => {
              if (result.data) setTasks(result.data.tasks);
            });
            // Add notification
            addNotification({
              title: 'New Task Assigned',
              message: data.taskTitle || 'You have a new task',
            });
            break;

          case 'meeting:started':
            setMeetingInfo((prev) => prev ? { ...prev, meetingStatus: 'LIVE' } : prev);
            addNotification({
              title: 'Meeting Started',
              message: 'The meeting has begun',
            });
            break;

          case 'meeting:state-changed':
            if (data.status) {
              setMeetingInfo((prev) => prev ? { ...prev, meetingStatus: data.status } : prev);
            }
            break;

          case 'notification':
            if (data.notification) {
              addNotification({
                title: data.notification.title,
                message: data.notification.message,
              });
            }
            break;
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'unsubscribe',
          channel: 'meeting',
          meetingId,
        }));
        ws.close();
      }
    };
  }, [meetingId, session, isLoading]);

  // Add notification helper
  const addNotification = (notification: { title: string; message: string }) => {
    const newNotification: Notification = {
      id: Date.now().toString(),
      title: notification.title,
      message: notification.message,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev]);
    toast({
      title: notification.title,
      description: notification.message,
    });
  };

  // Handle file selection
  const handleFileSelect = (task: ParticipantTask) => {
    setSelectedTask(task);
    fileInputRef.current?.click();
  };

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask) return;

    setIsUploading(true);
    setUploadProgress(0);

    const result = await uploadTaskFile(
      selectedTask.id,
      file,
      submissionNotes,
      (progress) => setUploadProgress(progress)
    );

    if (result.success) {
      toast({
        title: 'File Uploaded',
        description: 'Your submission has been received',
      });
      // Refresh tasks
      const tasksResult = await getMyTasks(meetingId);
      if (tasksResult.data) setTasks(tasksResult.data.tasks);
    } else {
      toast({
        title: 'Upload Failed',
        description: result.error || 'Please try again',
        variant: 'destructive',
      });
    }

    setIsUploading(false);
    setSelectedTask(null);
    setSubmissionNotes("");
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle text-only submission
  const handleSubmitWithoutFile = async (task: ParticipantTask) => {
    if (!submissionNotes.trim()) {
      toast({
        title: 'Notes Required',
        description: 'Please add notes for your submission',
        variant: 'destructive',
      });
      return;
    }

    setSelectedTask(task);
    const { error: submitError } = await submitTask(task.id, submissionNotes);

    if (submitError) {
      toast({
        title: 'Submission Failed',
        description: submitError.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Task Submitted',
        description: 'Your submission has been received',
      });
      const tasksResult = await getMyTasks(meetingId);
      if (tasksResult.data) setTasks(tasksResult.data.tasks);
    }

    setSelectedTask(null);
    setSubmissionNotes("");
  };

  // Handle leave meeting
  const handleLeaveMeeting = () => {
    router.push(`/meetings/${meetingId}/join`);
  };

  // Unread notification count
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Mark notifications as read
  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Loading state
  if (isLoading || isSessionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-48 md:col-span-2" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => router.push("/join")}>
              Back to Join
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              meetingInfo?.meetingStatus === "LIVE" || meetingInfo?.meetingStatus === "ACTIVE"
                ? "bg-green-100 dark:bg-green-900/30"
                : "bg-primary/10"
            }`}>
              <Video className={`h-5 w-5 ${
                meetingInfo?.meetingStatus === "LIVE" || meetingInfo?.meetingStatus === "ACTIVE"
                  ? "text-green-600 dark:text-green-400"
                  : "text-primary"
              }`} />
            </div>
            <div>
              <h1 className="font-semibold">{meetingInfo?.meetingTitle}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant={
                  meetingInfo?.meetingStatus === "LIVE" || meetingInfo?.meetingStatus === "ACTIVE"
                    ? "default"
                    : "secondary"
                }>
                  {meetingInfo?.meetingStatus === "LIVE" || meetingInfo?.meetingStatus === "ACTIVE" ? "Live" : meetingInfo?.meetingStatus}
                </Badge>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {attendeeCount}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) markAllRead();
                }}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>

              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-background border rounded-lg shadow-lg z-50">
                  <div className="flex items-center justify-between p-3 border-b">
                    <span className="font-medium">Notifications</span>
                    <Button variant="ghost" size="icon" onClick={() => setShowNotifications(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <ScrollArea className="h-64">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-center text-sm text-muted-foreground">
                        No notifications
                      </p>
                    ) : (
                      <div className="divide-y">
                        {notifications.map((n) => (
                          <div key={n.id} className="p-3 hover:bg-muted/50">
                            <p className="font-medium text-sm">{n.title}</p>
                            <p className="text-xs text-muted-foreground">{n.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(n.timestamp), "p")}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </div>

            <Button variant="ghost" size="sm" onClick={handleLeaveMeeting}>
              <LogOut className="h-4 w-4 mr-2" />
              Leave
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attendance Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Attendance
              </CardTitle>
              <CardDescription>{attendeeCount} checked in</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                {attendees.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No one has checked in yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {attendees.map((attendee) => (
                      <div
                        key={attendee.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>{attendee.name}</span>
                        {attendee.checkedInAt && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {format(new Date(attendee.checkedInAt), "p")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Tasks Panel */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Your Tasks
              </CardTitle>
              <CardDescription>
                {tasks.length === 0
                  ? "No tasks assigned"
                  : `${tasks.length} task${tasks.length > 1 ? "s" : ""} assigned`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tasks have been assigned to you yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{task.title}</h4>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={
                            task.status === "SUBMITTED" || task.status === "COMPLETED"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {task.status}
                        </Badge>
                      </div>

                      {/* Task metadata */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Due {format(new Date(task.dueDate), "MMM d, p")}
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {task.priority}
                        </Badge>
                      </div>

                      {/* Submission area */}
                      {task.status !== "SUBMITTED" && task.status !== "COMPLETED" ? (
                        <div className="space-y-3 pt-2 border-t">
                          <Textarea
                            placeholder="Add notes for your submission..."
                            value={selectedTask?.id === task.id ? submissionNotes : ""}
                            onChange={(e) => {
                              setSelectedTask(task);
                              setSubmissionNotes(e.target.value);
                            }}
                            className="min-h-[80px]"
                          />

                          {isUploading && selectedTask?.id === task.id && (
                            <div className="space-y-2">
                              <Progress value={uploadProgress} />
                              <p className="text-xs text-center text-muted-foreground">
                                Uploading... {uploadProgress}%
                              </p>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFileSelect(task)}
                              disabled={isUploading}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Upload File
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSubmitWithoutFile(task)}
                              disabled={isUploading || (selectedTask?.id !== task.id && !submissionNotes)}
                            >
                              Submit
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Submitted task display */
                        task.submission && (
                          <div className="pt-2 border-t bg-muted/30 rounded-lg p-3 mt-2">
                            <div className="flex items-center gap-2 text-sm text-green-600 mb-2">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Submitted {format(new Date(task.submission.createdAt), "MMM d, p")}</span>
                            </div>
                            {task.submission.notes && (
                              <p className="text-sm text-muted-foreground">
                                {task.submission.notes}
                              </p>
                            )}
                            {task.submission.files.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {task.submission.files.map((file) => (
                                  <div
                                    key={file.id}
                                    className="flex items-center gap-1 text-xs bg-background px-2 py-1 rounded"
                                  >
                                    <File className="h-3 w-3" />
                                    {file.fileName}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.csv,.zip"
      />
    </div>
  );
}
