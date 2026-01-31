"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { getGuestToken, getWorkflowId, ensureGuestSession } from "@/lib/api/guest-session"
import { getMeeting, MeetingResponse, MeetingStatus } from "@/lib/api/meeting"
import { Card, CardContent } from "@/components/ui/card"
import { format } from "date-fns"
import { useToast } from "@/components/ui/use-toast"

export default function NewMeeting() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [meeting, setMeeting] = useState<MeetingResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  
  // Check for guest workflow and load meeting data on mount
  useEffect(() => {
    const initSession = async () => {
      // Ensure valid guest workflow exists
      const sessionValid = await ensureGuestSession()
      
      if (!sessionValid) {
        router.push('/')
        return
      }
      
      // Verify we have a workflowId
      const workflowId = getWorkflowId()
      if (!workflowId) {
        console.error('No workflow ID found after session initialization')
        router.push('/')
        return
      }
      
      // Try to get meeting ID from query params
      const meetingId = searchParams.get('id')
      
      if (meetingId) {
        // Load actual meeting data with workflow context
        loadMeetingData(meetingId)
      } else {
        // If no ID provided, redirect to create meeting
        setError('No meeting ID provided. Please create a new meeting.')
        setIsLoading(false)
      }
    }
    
    initSession()
  }, [router, searchParams])
  
  // Timer for meeting duration
  useEffect(() => {
    if (meeting && meeting.status === 'ACTIVE') {
      const timer = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
      
      return () => clearInterval(timer)
    }
  }, [meeting])
  
  // Format elapsed time as HH:MM:SS
  const formatElapsedTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':')
  }
  
  // Load meeting data from API
  const loadMeetingData = async (meetingId: string) => {
    try {
      const { data, error } = await getMeeting(meetingId)
      
      if (error || !data) {
        throw new Error(error?.message || 'Failed to load meeting data')
      }
      
      setMeeting(data)
      
      // Display a toast notification based on meeting status
      if (data.status === 'PENDING') {
        toast({
          title: "Meeting is pending",
          description: "This meeting hasn't started yet."
        })
      } else if (data.status === 'ACTIVE') {
        toast({
          title: "Meeting is active",
          description: "You've joined an active meeting."
        })
      }
      
      setIsLoading(false)
    } catch (err) {
      console.error('Error loading meeting:', err)
      setError('Unable to load meeting details. The meeting may have ended or been removed.')
      setIsLoading(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-primary border-opacity-20 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Setting up your meeting...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="container max-w-md mx-auto py-12 px-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="bg-red-50 dark:bg-red-950 p-4 rounded-md">
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
              <Button onClick={() => router.push('/create-meeting')} className="mt-4">
                Create New Meeting
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (!meeting) {
    return null;
  }

  return (
    <div className="container max-w-5xl mx-auto py-12 px-4">
      <div className="bg-green-50 dark:bg-green-950 border-l-4 border-green-500 p-4 mb-6 rounded">
        <p className="text-green-700 dark:text-green-300">Your meeting has been created successfully!</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="bg-card p-6 rounded-lg border shadow-sm">
            <h1 className="text-2xl font-bold mb-2">{meeting.title}</h1>
            <p className="text-muted-foreground mb-6">Your meeting is ready for recording and transcription</p>
            
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium mb-2">Controls</h2>
                <div className="flex flex-wrap gap-2">
                  <Button className="bg-red-600 hover:bg-red-700">
                    Start Recording
                  </Button>
                  <Button variant="outline">
                    Invite Participants
                  </Button>
                  <Button variant="outline">
                    Share Screen
                  </Button>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-medium mb-2">Transcription</h2>
                <div className="bg-muted/40 rounded-lg p-4">
                  <p className="text-muted-foreground">Transcription will begin when you start recording</p>
                </div>
              </div>
              
              {meeting.meetingType === 'SCHEDULED' && meeting.scheduledAt && (
                <div className="bg-blue-50 dark:bg-blue-950/50 p-4 rounded-lg border border-blue-100 dark:border-blue-900">
                  <h2 className="font-medium text-blue-800 dark:text-blue-300 mb-1">Scheduled Meeting</h2>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    This meeting is scheduled for {format(new Date(meeting.scheduledAt), 'PPP p')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div>
          <div className="bg-card p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-medium mb-4">Meeting Info</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Meeting ID</p>
                <p className="font-medium font-mono">{meeting.id.substring(0, 8)}...</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                  <p className="font-medium capitalize">{meeting.status.toLowerCase()}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-medium">{formatElapsedTime(elapsedTime)}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Meeting Type</p>
                <p className="font-medium capitalize">{meeting.meetingType.toLowerCase()} Meeting</p>
              </div>

              <div className="pt-4">
                <Button variant="outline" className="w-full" onClick={() => router.push('/create-meeting')}>
                  End Meeting
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
