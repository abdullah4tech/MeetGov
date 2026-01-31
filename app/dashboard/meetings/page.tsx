"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/components/dashboard";
import { 
  listPersonalMeetings, 
  deletePersonalMeeting,
  type MeetingListItem,
  getStatusDisplay,
  getStatusColor,
} from "@/lib/api/personal-meeting";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateMeetingModal } from "@/components/create-meeting-modal";
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
  Search,
} from "lucide-react";
import { format } from "date-fns";

export default function MeetingsPage() {
  const router = useRouter();
  const { user } = useDashboard();
  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 0 });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<MeetingListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

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

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = meeting.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || meeting.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Meetings</h1>
          <p className="text-muted-foreground">Manage your meetings and recordings</p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Meeting
        </Button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search meetings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="LIVE">Live</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="ENDED">Ended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Meetings</CardTitle>
          <CardDescription>
            {pagination.total > 0 
              ? `${pagination.total} meeting${pagination.total > 1 ? 's' : ''} total`
              : 'Your meeting recordings and notes'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {meetingsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
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
          ) : filteredMeetings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No meetings found</p>
              <p className="text-sm">
                {searchQuery || statusFilter !== "all" 
                  ? "Try adjusting your filters" 
                  : "Create your first meeting to get started"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button className="mt-4" onClick={() => setCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Meeting
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMeetings.map((meeting) => (
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
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => confirmDelete(meeting)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

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
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => fetchMeetings(pagination.page + 1)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
