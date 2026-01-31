"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ensureGuestSession, canCreateMeeting, getWorkflowId, storeWorkflowId } from "@/lib/api/guest-session";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { format, parse } from "date-fns";
import { CalendarIcon, CheckIcon, Pencil1Icon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  createMeeting, 
  MeetingType as ApiMeetingType, 
  formatParticipants, 
  formatScheduledDateTime,
  CreateMeetingRequest
} from "@/lib/api/meeting";
import { generateMeetingDraft, testConnection, closeConnection } from "@/lib/api/ai-assistant";
import { useToast } from "@/components/ui/use-toast";

// Local UI types
type UiMeetingType = "instant" | "scheduled";
type CreateMode = "manual" | "ai";
type MeetingDetails = {
  title: string;
  type: UiMeetingType;
  date?: Date;
  time?: string;
  duration: number;
  participants: string[];
  location?: string;
};

// Helper to get the next occurrence of a day of the week (0 = Sunday, 6 = Saturday)
const getNextDayOfWeek = (dayOfWeek: number): Date => {
  const today = new Date();
  const resultDate = new Date(today.getTime());
  resultDate.setDate(today.getDate() + (7 + dayOfWeek - today.getDay()) % 7);
  return resultDate;
};

// Helper to extract potential participants from text
const extractParticipantsFromText = (text: string): string[] => {
  // Very basic implementation - in a real app, this would use NLP or be handled by the AI service
  const match = text.match(/(\d+)\s*people/i);
  const count = match ? parseInt(match[1]) : 0;
  
  // Generate placeholder participants based on count
  return Array.from({ length: Math.min(count, 10) }, (_, i) => `Guest ${i + 1}`);
};

export default function CreateMeetingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<CreateMode>("ai");
  const [activeCard, setActiveCard] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSessionLoading, setIsSessionLoading] = useState<boolean>(true);
  const [aiProcessing, setAiProcessing] = useState<boolean>(false);
  const [aiMessage, setAiMessage] = useState<string>("");
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string>("");
  // WebSocket connection status
  const [wsStatus, setWsStatus] = useState<'unknown' | 'connecting' | 'connected' | 'error'>('unknown');
  // Always allow creating meetings - limit disabled
  const [canCreateNewMeeting, setCanCreateNewMeeting] = useState<boolean>(true);
  
  // Meeting details state
  const [meetingDetails, setMeetingDetails] = useState<MeetingDetails>({
    title: "",
    type: "instant",
    duration: 30,
    participants: [],
  });

  // Verify WebSocket connection
  useEffect(() => {
    let cancelled = false;
    
    const verifyConnection = async () => {
      try {
        setWsStatus('connecting');
        const result = await testConnection();
        if (!cancelled) {
          console.log('WebSocket connection test result:', result);
          setWsStatus('connected');
        }
      } catch (error) {
        if (!cancelled) {
          console.error('WebSocket connection test failed:', error);
          setWsStatus('error');
          setApiError('Cannot connect to AI assistant service. Please try again later or use manual mode.');
        }
      }
    };
    
    // Only test when in AI mode
    if (mode === 'ai') {
      verifyConnection();
    }
    
    // Cleanup: close connection when switching modes or unmounting
    return () => {
      cancelled = true;
      if (mode === 'ai') {
        closeConnection();
      }
    };
  }, [mode]);

  // Check for guest workflow on mount
  useEffect(() => {
    const initWorkflow = async () => {
      setIsSessionLoading(true);
      console.log('Starting workflow initialization');
      
      try {
        // Ensure guest workflow session exists
        const sessionValid = await ensureGuestSession();
        console.log('Session valid:', sessionValid);
        
        // TEMPORARY: Skip redirect to allow testing
        if (!sessionValid) {
          console.warn('Session validation failed, but skipping redirect for testing');
          // Create a temporary session if needed
          // Generate a fake workflowId if none exists
          if (!getWorkflowId()) {
            console.log('Creating temporary workflowId');
            storeWorkflowId('temp-' + Date.now());
          }
        }
        
        // Verify we have a workflowId
        const workflowId = getWorkflowId();
        console.log('Current workflowId:', workflowId);
        
        if (!workflowId) {
          console.error('No workflow ID found after session initialization');
          // TEMPORARY: Skip redirect to allow testing
          console.warn('No workflowId, but skipping redirect for testing');
          storeWorkflowId('temp-' + Date.now());
        }
        
        // Meeting limit check disabled
        setCanCreateNewMeeting(true);
      } catch (err) {
        console.error('Workflow initialization error:', err);
        setApiError('Unable to start guest workflow. Please try again later.');
      } finally {
        setIsSessionLoading(false);
      }
    };
    
    initWorkflow();
  }, [router, toast]);

  // Handle manual mode form submission
  const handleNextCard = () => {
    if (activeCard < 4 && validateCurrentCard()) {
      setActiveCard(activeCard + 1);
    } else if (activeCard === 4) {
      setShowConfirmation(true);
    }
  };

  // Validate current card
  const validateCurrentCard = (): boolean => {
    if (activeCard === 1) {
      if (!meetingDetails.title) return false;
      if (meetingDetails.type === "scheduled" && (!meetingDetails.date || !meetingDetails.time)) return false;
    }
    return true;
  };

  // Handle AI assistant input
  const handleAiInput = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!aiMessage || !canCreateNewMeeting) return;
    
    // Check WebSocket status before proceeding
    if (wsStatus === 'error') {
      setApiError('Cannot connect to AI assistant service. Please try again later or use manual mode.');
      return;
    }
    
    setIsLoading(true);
    setAiProcessing(true);
    setApiError("");
    
    let requestTimeout: NodeJS.Timeout | null = null;
    
    try {
      // Set a timeout for the WebSocket request
      const timeoutPromise = new Promise<never>((_, reject) => {
        requestTimeout = setTimeout(() => {
          reject(new Error('AI assistant request timed out'));
        }, 15000); // 15 second timeout
      });
      
      // Race between the actual request and the timeout
      const meetingDraft = await Promise.race([
        generateMeetingDraft(aiMessage),
        timeoutPromise
      ]);
      
      // Convert API response to UI model
      const parsedDetails: MeetingDetails = {
        title: meetingDraft.title,
        // Convert API meeting type to UI type (lowercase)
        type: meetingDraft.meetingType.toLowerCase() as UiMeetingType,
        duration: meetingDraft.durationMinutes,
        // Convert participants from objects to strings for the UI
        participants: meetingDraft.participants?.map(p => p.name || p.email || "").filter(Boolean) || [],
        location: meetingDraft.location
      };
      
      // Handle scheduled meeting date/time
      if (meetingDraft.scheduledAt && parsedDetails.type === "scheduled") {
        const scheduledDate = new Date(meetingDraft.scheduledAt);
        parsedDetails.date = scheduledDate;
        parsedDetails.time = format(scheduledDate, "HH:mm");
      }
      
      // Make sure we don't exceed 60 minutes (free plan limit)
      if (parsedDetails.duration > 60) {
        parsedDetails.duration = 60;
      }
      
      setMeetingDetails(parsedDetails);
      setShowConfirmation(true);
    } catch (err) {
      console.error('AI assistant error:', err);
      setApiError(err instanceof Error && err.message === 'AI assistant request timed out' 
        ? 'The AI assistant is taking too long to respond. Please try again or use the manual form.'
        : 'Unable to process your request with AI assistant. Please try again or use the manual form.');
      toast({
        title: "AI Assistant Error",
        description: err instanceof Error && err.message === 'AI assistant request timed out' 
          ? "Request timed out. Try using manual mode instead."
          : "Could not generate meeting details. Try using manual mode instead.",
        variant: "destructive"
      });
    } finally {
      if (requestTimeout) clearTimeout(requestTimeout);
      setIsLoading(false);
      setAiProcessing(false);
    }
  };

  // Handle final meeting creation
  const handleCreateMeeting = async () => {
    
    setIsLoading(true);
    setApiError("");
    
    let requestTimeout: NodeJS.Timeout | null = null;
    
    try {
      // Prepare the meeting data for the API
      console.log('[DEBUG] meetingDetails.type:', meetingDetails.type);
      const apiMeetingData: CreateMeetingRequest = {
        title: meetingDetails.title,
        // Map UI type to API type (uppercase)
        meetingType: meetingDetails.type === "instant" ? "INSTANT" : "SCHEDULED" as ApiMeetingType,
        durationMinutes: meetingDetails.duration,
        // Format participants as API expects
        participants: meetingDetails.participants.length > 0 ? 
          formatParticipants(meetingDetails.participants) : undefined,
        location: meetingDetails.location
      };
      
      // Add scheduledAt if applicable - combining date and time into ISO format
      if (meetingDetails.type === 'scheduled' && meetingDetails.date && meetingDetails.time) {
        apiMeetingData.scheduledAt = formatScheduledDateTime(meetingDetails.date, meetingDetails.time);
      }
      
      // Set up a timeout for the API request
      const timeoutPromise = new Promise<never>((_, reject) => {
        requestTimeout = setTimeout(() => {
          reject(new Error('Create meeting request timed out'));
        }, 10000); // 10 second timeout
      });
      
      // Race between the actual API request and the timeout
      const response = await Promise.race([
        createMeeting(apiMeetingData),
        timeoutPromise
      ]);
      
      const { data, error } = response;
      
      console.log('[DEBUG] API response data:', data);
      console.log('[DEBUG] data.meetingType:', data?.meetingType);
      
      if (error || !data) {
        throw new Error(error?.message || 'Failed to create meeting');
      }
      
      // Show success message
      toast({
        title: "Meeting Created",
        description: "Your meeting has been successfully created"
      });
      
      // Route based on meeting type from backend response
      // INSTANT → Meeting Room, SCHEDULED → Waiting Room
      if (data.meetingType === 'INSTANT') {
        router.push(`/meeting/${data.id}`);
      } else {
        router.push(`/meeting/${data.id}/waiting`);
      }
    } catch (err) {
      console.error('Error creating meeting:', err);
      
      if (err instanceof Error && err.message === 'Create meeting request timed out') {
        setApiError('Request timed out. Please try again later.');
        toast({
          title: "Timeout Error",
          description: "The server is taking too long to respond. Please try again.",
          variant: "destructive"
        });
      // Meeting limit error handling removed
      } else {
        setApiError('Unable to create meeting. Please try again.');
        toast({
          title: "Error",
          description: "Could not create meeting",
          variant: "destructive"
        });
      }
      
      setIsLoading(false);
    } finally {
      if (requestTimeout) clearTimeout(requestTimeout);
    }
  };

  // Helper to get duration description
  const getDurationDescription = (minutes: number): string => {
    if (minutes <= 15) return `${minutes} minutes — quick check-in`;
    if (minutes <= 30) return `${minutes} minutes — perfect for a focused meeting`;
    if (minutes <= 45) return `${minutes} minutes — good for detailed discussions`;
    return `${minutes} minutes — comprehensive session`;
  };

  // Helper to format participants for display
  const formatParticipantsDisplay = (): string => {
    if (meetingDetails.participants.length === 0) return "No participants added";
    return meetingDetails.participants.join(", ");
  };

  return (
    <main className="container max-w-2xl mx-auto py-6 px-4 md:py-12 md:px-0" role="main">
      <Card className="border-0 shadow-md" role="region" aria-labelledby="create-meeting-heading">
        <CardHeader className="text-center">
          <CardTitle id="create-meeting-heading" className="text-2xl font-bold">Create your meeting</CardTitle>
          <CardDescription className="text-base" id="create-meeting-description">
            Record, transcribe, and get AI notes automatically.
          </CardDescription>
        </CardHeader>
        
        {/* Mode Selector */}
        <div className="flex justify-center mb-6 px-6">
          <div 
            className="inline-flex border rounded-lg p-1 w-full max-w-sm"
            role="tablist"
            aria-label="Meeting creation mode"
          >
            <button 
              onClick={() => setMode("manual")} 
              className={cn(
                "flex-1 py-2 px-3 rounded-md transition-colors text-sm font-medium",
                mode === "manual" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
              role="tab"
              aria-selected={mode === "manual"}
              aria-controls="manual-panel"
              id="manual-tab"
            >
              <span aria-hidden="true">✍️</span> Set it up manually
            </button>
            <button 
              onClick={() => setMode("ai")} 
              className={cn(
                "flex-1 py-2 px-3 rounded-md transition-colors text-sm font-medium",
                mode === "ai" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
              role="tab"
              aria-selected={mode === "ai"}
              aria-controls="ai-panel"
              id="ai-tab"
            >
              <span aria-hidden="true">🤖</span> Let AI create it
            </button>
          </div>
        </div>
        
        {apiError && (
          <div className="px-6 pb-2">
            <div 
              className="bg-destructive/10 text-destructive text-sm p-3 rounded-md"
              role="alert"
              aria-live="polite"
            >
              {apiError}
            </div>
          </div>
        )}

        {isSessionLoading ? (
          <CardContent>
            <div className="flex justify-center items-center py-12" role="status" aria-live="polite">
              <div className="w-8 h-8 border-2 border-t-primary border-opacity-20 rounded-full animate-spin" aria-hidden="true"></div>
              <span className="ml-3 text-sm text-muted-foreground">Initializing session...</span>
            </div>
          </CardContent>
        ) : !showConfirmation ? (
          <CardContent className="space-y-6">
            {mode === "manual" ? (
              /* Manual Setup Mode */
              <div 
                className="space-y-6"
                role="tabpanel"
                id="manual-panel"
                aria-labelledby="manual-tab"
              >
                {/* Card 1: Meeting Basics */}
                <div className={cn("transition-opacity", activeCard >= 1 ? "opacity-100" : "opacity-50")}>
                  <h3 className="font-semibold mb-3">Meeting Basics</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Meeting title</Label>
                      <Input
                        id="title"
                        placeholder="Weekly Team Sync"
                        value={meetingDetails.title}
                        onChange={(e) => setMeetingDetails({...meetingDetails, title: e.target.value})}
                      />
                      {!meetingDetails.title && <p className="text-xs text-muted-foreground">A title helps everyone know what the meeting is about</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Meeting type</Label>
                      <RadioGroup
                        value={meetingDetails.type}
                        onValueChange={(value: UiMeetingType) => setMeetingDetails({...meetingDetails, type: value})}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="instant" id="instant" />
                          <Label htmlFor="instant">Instant</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="scheduled" id="scheduled" />
                          <Label htmlFor="scheduled">Scheduled</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    {meetingDetails.type === "scheduled" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !meetingDetails.date && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {meetingDetails.date ? format(meetingDetails.date, "PPP") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={meetingDetails.date}
                                onSelect={(date) => date && setMeetingDetails({...meetingDetails, date})}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="time">Time</Label>
                          <Input
                            id="time"
                            type="time"
                            value={meetingDetails.time || ''}
                            onChange={(e) => setMeetingDetails({...meetingDetails, time: e.target.value})}
                          />
                        </div>
                        
                        {(!meetingDetails.date || !meetingDetails.time) && (
                          <p className="col-span-2 text-xs text-muted-foreground">We'll need a date and time to schedule this</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Card 2: Duration */}
                {activeCard >= 2 && (
                  <div className={cn("transition-opacity space-y-4", activeCard >= 2 ? "opacity-100" : "opacity-50")}>
                    <h3 className="font-semibold mb-3">Meeting Duration</h3>
                    
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <Slider
                            defaultValue={[meetingDetails.duration]}
                            max={60}
                            min={15}
                            step={15}
                            onValueChange={(values) => {
                              const duration = values[0];
                              if (duration <= 60) {
                                setMeetingDetails({...meetingDetails, duration})
                              }
                            }}
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">{getDurationDescription(meetingDetails.duration)}</p>
                          {meetingDetails.duration >= 60 && (
                            <p className="text-xs text-muted-foreground mt-1">Free meetings are capped at 60 minutes</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Card 3: Participants */}
                {activeCard >= 3 && (
                  <div className={cn("transition-opacity", activeCard >= 3 ? "opacity-100" : "opacity-50")}>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold">Invite Participants</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="participant-emails" className="text-sm">
                          Email Addresses <span className="text-muted-foreground">(required for invites)</span>
                        </Label>
                        <Input
                          id="participant-emails"
                          type="text"
                          placeholder="john@example.com, jane@example.com"
                          value={meetingDetails.participants.join(", ")}
                          onChange={(e) => {
                            const value = e.target.value;
                            setMeetingDetails({
                              ...meetingDetails, 
                              participants: value ? value.split(",").map(p => p.trim()).filter(p => p.length > 0) : []
                            });
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter email addresses separated by commas. Participants will receive an invite with the meeting access code.
                        </p>
                      </div>
                      
                      {/* Email validation feedback */}
                      {meetingDetails.participants.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {meetingDetails.participants.map((email, index) => {
                            const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
                            return (
                              <span
                                key={index}
                                className={cn(
                                  "inline-flex items-center px-2 py-1 rounded-full text-xs",
                                  isValidEmail 
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                )}
                              >
                                {isValidEmail ? (
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                )}
                                {email}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Card 4: Location */}
                {activeCard >= 4 && (
                  <div className={cn("transition-opacity", activeCard >= 4 ? "opacity-100" : "opacity-50")}>
                    <h3 className="font-semibold mb-3">Location (Optional)</h3>
                    
                    <div className="space-y-2">
                      <Input
                        placeholder="Conference Room B / Zoom / Café"
                        value={meetingDetails.location || ''}
                        onChange={(e) => setMeetingDetails({...meetingDetails, location: e.target.value})}
                      />
                      <p className="text-xs text-muted-foreground">Where will this meeting take place?</p>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end mt-6">
                  <Button 
                    onClick={handleNextCard} 
                    disabled={!validateCurrentCard() || !canCreateNewMeeting}
                  >
                    {activeCard < 4 ? "Next" : "Review"}
                  </Button>
                </div>
              </div>
            ) : (
              /* AI Assistant Mode */
              <div 
                className="space-y-6"
                role="tabpanel"
                id="ai-panel"
                aria-labelledby="ai-tab"
              >
                {/* AI Chat Input */}
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <p className="text-sm mb-2" id="ai-input-description">Tell me about your meeting and I'll set it up:</p>
                </div>
                
                <form onSubmit={handleAiInput} className="flex items-end gap-2" aria-describedby="ai-input-description">
                  <div className="flex-1">
                    <Input
                      placeholder="Meeting with 5 people tomorrow for 30 minutes"
                      value={aiMessage}
                      onChange={(e) => setAiMessage(e.target.value)}
                      aria-label="Describe your meeting for AI assistant"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading || !aiMessage || !canCreateNewMeeting || wsStatus === 'error'} 
                    className="relative"
                    aria-busy={aiProcessing || isLoading}
                    aria-label={aiProcessing ? "Processing your request" : "Create meeting with AI"}
                  >
                    {wsStatus === 'connecting' ? (
                      <>
                        <span className="absolute inset-0 flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-t-white border-opacity-20 rounded-full animate-spin"></div>
                        </span>
                        <span className="opacity-0">Connecting...</span>
                      </>
                    ) : aiProcessing ? (
                      <>
                        <span className="absolute inset-0 flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-t-white border-opacity-20 rounded-full animate-spin"></div>
                        </span>
                        <span className="opacity-0">Processing...</span>
                      </>
                    ) : isLoading ? "Processing..." : "Create"}
                  </Button>
                </form>
                
                {wsStatus === 'error' && (
                  <div className="mt-2 text-sm text-destructive" role="alert">
                    AI assistant service is unavailable. Please try using manual mode.
                  </div>
                )}
                
                <div className="text-center text-sm text-muted-foreground mt-3">
                  <p id="example-prompts-label">Examples:</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-2" role="group" aria-labelledby="example-prompts-label">
                    <button
                      type="button"
                      className="px-3 py-1 bg-secondary/50 hover:bg-secondary rounded-full text-xs"
                      onClick={() => setAiMessage("Weekly sync next Friday at 10")}
                      aria-label="Use example: Weekly sync next Friday at 10"
                    >
                      Weekly sync next Friday at 10
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 bg-secondary/50 hover:bg-secondary rounded-full text-xs"
                      onClick={() => setAiMessage("Meeting with 5 people tomorrow for 30 minutes")}
                      aria-label="Use example: Meeting with 5 people tomorrow for 30 minutes"
                    >
                      Meeting with 5 people tomorrow for 30 minutes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        ) : (
          /* Confirmation Step */
          <CardContent className="space-y-6" role="region" aria-label="Meeting confirmation">
            <div className="bg-muted/30 rounded-lg p-5">
              <h3 className="font-semibold mb-3 flex justify-between">
                <span id="meeting-details-heading">Meeting Details</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowConfirmation(false)}
                  aria-label="Edit meeting details"
                >
                  <Pencil1Icon className="h-4 w-4" aria-hidden="true" />
                </Button>
              </h3>
              
              <dl className="space-y-2 text-sm" aria-labelledby="meeting-details-heading">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Title:</dt>
                  <dd className="font-medium">{meetingDetails.title}</dd>
                </div>
                
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Type:</dt>
                  <dd>{meetingDetails.type === "instant" ? "Instant Meeting" : "Scheduled Meeting"}</dd>
                </div>
                
                {meetingDetails.type === "scheduled" && meetingDetails.date && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Date & Time:</dt>
                    <dd>{`${format(meetingDetails.date, "PPP")} at ${meetingDetails.time}`}</dd>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Duration:</dt>
                  <dd>{meetingDetails.duration} minutes</dd>
                </div>
                
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Participants:</dt>
                  <dd className="text-right">{formatParticipantsDisplay()}</dd>
                </div>
                
                {meetingDetails.location && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Location:</dt>
                    <dd>{meetingDetails.location}</dd>
                  </div>
                )}
              </dl>
            </div>
            
            <div 
              className="bg-blue-50 dark:bg-blue-950/50 rounded-lg p-4 border border-blue-200 dark:border-blue-900"
              role="note"
              aria-label="Meeting features"
            >
              <div className="flex gap-2 items-start">
                <div className="bg-blue-100 dark:bg-blue-900 p-1.5 rounded-md" aria-hidden="true">
                  <CheckIcon className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                </div>
                <div>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    This meeting can be recorded, transcribed, and summarized automatically.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        )}
        
        {showConfirmation && (
          <CardFooter className="flex-col space-y-2">
            <Button 
              className="w-full relative" 
              onClick={handleCreateMeeting} 
              disabled={isLoading || !canCreateNewMeeting}
              aria-busy={isLoading}
              aria-label={isLoading ? "Creating meeting" : "Start your meeting now"}
            >
              {isLoading ? (
                <>
                  <span className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-t-white border-opacity-20 rounded-full animate-spin" aria-hidden="true"></div>
                  </span>
                  <span className="opacity-0">Setting up...</span>
                </>
              ) : "Start Meeting"}
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setShowConfirmation(false)}
              aria-label="Go back and edit meeting details"
            >
              Edit details
            </Button>
          </CardFooter>
        )}
      </Card>
    </main>
  );
}
