"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Video, 
  Calendar, 
  Plus,
  Users,
  Eye,
  Play,
  ChevronLeft,
  ChevronRight,
  Search,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { 
  listEnterpriseMeetings, 
  EnterpriseMeetingListItem 
} from "@/lib/api/enterprise";

interface EnterpriseMeeting extends EnterpriseMeetingListItem {}

export default function EnterpriseMeetingsPage() {
  const router = useRouter();
  const { user } = useDashboard();
  const [meetings, setMeetings] = useState<EnterpriseMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const canManageMeetings = user?.enterprise?.role === "ADMIN" || user?.enterprise?.role === "ORGANIZER";

  const fetchMeetings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await listEnterpriseMeetings({
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchQuery || undefined,
      });
      setMeetings(response.meetings);
    } catch (err) {
      console.error("Failed to fetch meetings:", err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LIVE':
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filtering is now done server-side via API, so we just use meetings directly
  const filteredMeetings = meetings;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Meetings</h1>
          <p className="text-muted-foreground">Manage organization meetings</p>
        </div>
        {canManageMeetings && (
          <Button onClick={() => router.push("/create-meeting")}>
            <Plus className="h-4 w-4 mr-2" />
            New Meeting
          </Button>
        )}
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
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Meetings</CardTitle>
          <CardDescription>
            {meetings.length} meeting{meetings.length !== 1 ? 's' : ''} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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
                  : "No meetings have been scheduled yet"}
              </p>
              {canManageMeetings && !searchQuery && statusFilter === "all" && (
                <Button className="mt-4" onClick={() => router.push("/create-meeting")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Meeting
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
                        : meeting.status === 'SCHEDULED'
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      {meeting.status === 'LIVE' || meeting.status === 'ACTIVE' ? (
                        <Play className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : meeting.status === 'SCHEDULED' ? (
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
                        {meeting.scheduledAt && (
                          <span>{format(new Date(meeting.scheduledAt), 'MMM d, h:mm a')}</span>
                        )}
                        <span>by {meeting.organizerName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(meeting.status)}>
                      {meeting.status}
                    </Badge>
                    {(meeting.status === 'LIVE' || meeting.status === 'ACTIVE' || meeting.status === 'SCHEDULED') && (
                      <Button
                        size="sm"
                        onClick={() => router.push(`/meeting/${meeting.id}`)}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Join
                      </Button>
                    )}
                    {(meeting.status === 'COMPLETED' || meeting.status === 'ENDED') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/meeting/${meeting.id}/artifacts`)}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Artifacts
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/meeting/${meeting.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
