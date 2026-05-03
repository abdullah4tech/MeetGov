"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { 
  CalendarIcon, 
  CheckIcon, 
  Pencil1Icon,
  CopyIcon,
} from "@radix-ui/react-icons";
import { 
  ArrowLeft, 
  Loader2, 
  Mail, 
  CheckCircle2, 
  XCircle,
  Sparkles,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  createPersonalMeeting, 
  formatParticipants, 
  formatScheduledDateTime,
  type CreateMeetingRequest,
  type MeetingDetail,
  type InviteResult,
} from "@/lib/api/personal-meeting";
import { generateMeetingDraft, testConnection, closeConnection } from "@/lib/api/ai-assistant";
import { useToast } from "@/components/ui/use-toast";

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

export default function CreateMeetingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoaded } = useUser();
  
  const [mode, setMode] = useState<CreateMode>("ai");
  const [activeCard, setActiveCard] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [aiProcessing, setAiProcessing] = useState<boolean>(false);
  const [aiMessage, setAiMessage] = useState<string>("");
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string>("");
  const [wsStatus, setWsStatus] = useState<'unknown' | 'connecting' | 'connected' | 'error'>('unknown');
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [createdMeeting, setCreatedMeeting] = useState<MeetingDetail | null>(null);
  const [inviteResults, setInviteResults] = useState<InviteResult[]>([]);
  
  const [meetingDetails, setMeetingDetails] = useState<MeetingDetails>({
    title: "",
    type: "instant",
    duration: 30,
    participants: [],
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/auth/signin");
    }
  }, [user, isLoaded, router]);

  // Verify WebSocket connection for AI mode
  useEffect(() => {
    let cancelled = false;
    
    const verifyConnection = async () => {
      try {
        setWsStatus('connecting');
        const result = await testConnection();
        if (!cancelled) {
          setWsStatus('connected');
        }
      } catch (error) {
        if (!cancelled) {
          setWsStatus('error');
          setApiError('Cannot connect to AI assistant. Try manual mode.');
        }
      }
    };
    
    if (mode === 'ai') {
      verifyConnection();
    }
    
    return () => {
      cancelled = true;
      if (mode === 'ai') {
        closeConnection();
      }
    };
  }, [mode]);

  const handleNextCard = () => {
    if (activeCard < 4 && validateCurrentCard()) {
      setActiveCard(activeCard + 1);
    } else if (activeCard === 4) {
      setShowConfirmation(true);
    }
  };

  const validateCurrentCard = (): boolean => {
    if (activeCard === 1) {
      if (!meetingDetails.title) return false;
      if (meetingDetails.type === "scheduled" && (!meetingDetails.date || !meetingDetails.time)) return false;
    }
    return true;
  };

  const handleAiInput = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!aiMessage) return;
    
    if (wsStatus === 'error') {
      setApiError('Cannot connect to AI assistant. Please try manual mode.');
      return;
    }
    
    setIsLoading(true);
    setAiProcessing(true);
    setApiError("");
    
    try {
      const meetingDraft = await generateMeetingDraft(aiMessage);
      
      const parsedDetails: MeetingDetails = {
        title: meetingDraft.title,
        type: meetingDraft.meetingType.toLowerCase() as UiMeetingType,
        duration: Math.min(meetingDraft.durationMinutes, 480), // Max 8 hours for personal
        participants: meetingDraft.participants?.map(p => p.email || p.name || "").filter(Boolean) || [],
        location: meetingDraft.location
      };
      
      if (meetingDraft.scheduledAt && parsedDetails.type === "scheduled") {
        const scheduledDate = new Date(meetingDraft.scheduledAt);
        parsedDetails.date = scheduledDate;
        parsedDetails.time = format(scheduledDate, "HH:mm");
      }
      
      setMeetingDetails(parsedDetails);
      setShowConfirmation(true);
    } catch (err) {
      console.error('AI assistant error:', err);
      setApiError('Unable to process your request. Please try again or use manual mode.');
      toast({
        title: "AI Assistant Error",
        description: "Could not generate meeting details. Try using manual mode.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setAiProcessing(false);
    }
  };

  const handleCreateMeeting = async () => {
    setIsLoading(true);
    setApiError("");
    
    try {
      const apiMeetingData: CreateMeetingRequest = {
        title: meetingDetails.title,
        meetingType: meetingDetails.type === "instant" ? "INSTANT" : "SCHEDULED",
        durationMinutes: meetingDetails.duration,
        participants: meetingDetails.participants.length > 0 
          ? formatParticipants(meetingDetails.participants) 
          : undefined,
        location: meetingDetails.location
      };
      
      if (meetingDetails.type === 'scheduled' && meetingDetails.date && meetingDetails.time) {
        apiMeetingData.scheduledAt = formatScheduledDateTime(meetingDetails.date, meetingDetails.time);
      }
      
      const { data, error } = await createPersonalMeeting(apiMeetingData);
      
      if (error || !data) {
        throw new Error(error?.message || 'Failed to create meeting');
      }
      
      // Show success modal
      setCreatedMeeting(data.meeting);
      setInviteResults(data.inviteResults || []);
      setShowSuccessModal(true);
      
      toast({
        title: "Meeting Created",
        description: "Your meeting has been successfully created"
      });
    } catch (err) {
      console.error('Error creating meeting:', err);
      setApiError('Unable to create meeting. Please try again.');
      toast({
        title: "Error",
        description: "Could not create meeting",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (createdMeeting?.joinCode) {
      navigator.clipboard.writeText(createdMeeting.joinCode);
      toast({
        title: "Copied",
        description: "Access code copied to clipboard"
      });
    }
  };

  const handleGoToMeeting = () => {
    if (createdMeeting) {
      if (createdMeeting.meetingType === 'INSTANT') {
        router.push(`/meeting/${createdMeeting.id}`);
      } else {
        router.push(`/meeting/${createdMeeting.id}/waiting`);
      }
    }
  };

  const getDurationDescription = (minutes: number): string => {
    if (minutes <= 15) return `${minutes} minutes — quick check-in`;
    if (minutes <= 30) return `${minutes} minutes — focused meeting`;
    if (minutes <= 60) return `${minutes} minutes — detailed discussion`;
    if (minutes <= 120) return `${minutes} minutes — extended session`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m — comprehensive meeting`;
  };

  const formatParticipantsDisplay = (): string => {
    if (meetingDetails.participants.length === 0) return "No participants added";
    return meetingDetails.participants.join(", ");
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <div className="container max-w-2xl mx-auto py-6 px-4 md:py-12 md:px-0">
        <Card className="border-0 shadow-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Create a Meeting</CardTitle>
            <CardDescription className="text-base">
              Record, transcribe, and get AI-powered notes automatically.
            </CardDescription>
          </CardHeader>
          
          {/* Mode Selector */}
          <div className="flex justify-center mb-6 px-6">
            <div className="inline-flex border rounded-lg p-1 w-full max-w-sm">
              <button 
                onClick={() => setMode("manual")} 
                className={cn(
                  "flex-1 py-2 px-3 rounded-md transition-colors text-sm font-medium",
                  mode === "manual" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                ✍️ Manual Setup
              </button>
              <button 
                onClick={() => setMode("ai")} 
                className={cn(
                  "flex-1 py-2 px-3 rounded-md transition-colors text-sm font-medium",
                  mode === "ai" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                <Sparkles className="h-4 w-4 inline mr-1" />
                AI Assistant
              </button>
            </div>
          </div>
          
          {apiError && (
            <div className="px-6 pb-2">
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {apiError}
              </div>
            </div>
          )}

          {!showConfirmation ? (
            <CardContent className="space-y-6">
              {mode === "manual" ? (
                <div className="space-y-6">
                  {/* Card 1: Meeting Basics */}
                  <div className={cn("transition-opacity", activeCard >= 1 ? "opacity-100" : "opacity-50")}>
                    <h3 className="font-semibold mb-3">Meeting Basics</h3>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Meeting title *</Label>
                        <Input
                          id="title"
                          placeholder="Weekly Team Sync"
                          value={meetingDetails.title}
                          onChange={(e) => setMeetingDetails({...meetingDetails, title: e.target.value})}
                        />
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
                            <Label htmlFor="instant">Start Now</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="scheduled" id="scheduled" />
                            <Label htmlFor="scheduled">Schedule for Later</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      
                      {meetingDetails.type === "scheduled" && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Date *</Label>
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
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="time">Time *</Label>
                            <Input
                              id="time"
                              type="time"
                              value={meetingDetails.time || ''}
                              onChange={(e) => setMeetingDetails({...meetingDetails, time: e.target.value})}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Card 2: Duration */}
                  {activeCard >= 2 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold mb-3">Duration</h3>
                      <div className="space-y-4">
                        <Slider
                          defaultValue={[meetingDetails.duration]}
                          max={240}
                          min={15}
                          step={15}
                          onValueChange={(values) => setMeetingDetails({...meetingDetails, duration: values[0]})}
                        />
                        <p className="text-sm text-center text-muted-foreground">
                          {getDurationDescription(meetingDetails.duration)}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Card 3: Participants */}
                  {activeCard >= 3 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold mb-3">Invite Participants (Optional)</h3>
                      <div className="space-y-2">
                        <Label htmlFor="participant-emails">Email Addresses</Label>
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
                          Participants will receive an email invite with the meeting access code.
                        </p>
                      </div>
                      
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
                                {isValidEmail ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                                {email}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Card 4: Location */}
                  {activeCard >= 4 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold mb-3">Location (Optional)</h3>
                      <Input
                        placeholder="Conference Room B / Zoom / Café"
                        value={meetingDetails.location || ''}
                        onChange={(e) => setMeetingDetails({...meetingDetails, location: e.target.value})}
                      />
                    </div>
                  )}
                  
                  <div className="flex justify-end mt-6">
                    <Button onClick={handleNextCard} disabled={!validateCurrentCard()}>
                      {activeCard < 4 ? "Next" : "Review"}
                    </Button>
                  </div>
                </div>
              ) : (
                /* AI Assistant Mode */
                <div className="space-y-6">
                  <div className="bg-muted/50 rounded-lg p-4 mb-4">
                    <p className="text-sm mb-2">Describe your meeting and I'll set it up:</p>
                  </div>
                  
                  <form onSubmit={handleAiInput} className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Team standup tomorrow at 10am for 30 minutes"
                        value={aiMessage}
                        onChange={(e) => setAiMessage(e.target.value)}
                      />
                    </div>
                    <Button type="submit" disabled={isLoading || !aiMessage || wsStatus === 'error'}>
                      {aiProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                    </Button>
                  </form>
                  
                  {wsStatus === 'error' && (
                    <p className="text-sm text-destructive">AI assistant unavailable. Try manual mode.</p>
                  )}
                  
                  <div className="text-center text-sm text-muted-foreground">
                    <p>Examples:</p>
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                      <button
                        className="px-3 py-1 bg-secondary/50 hover:bg-secondary rounded-full text-xs"
                        onClick={() => setAiMessage("Weekly sync next Friday at 10am")}
                      >
                        Weekly sync next Friday at 10am
                      </button>
                      <button
                        className="px-3 py-1 bg-secondary/50 hover:bg-secondary rounded-full text-xs"
                        onClick={() => setAiMessage("30 minute call with 3 people tomorrow")}
                      >
                        30 minute call with 3 people tomorrow
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          ) : (
            /* Confirmation Step */
            <CardContent className="space-y-6">
              <div className="bg-muted/30 rounded-lg p-5">
                <h3 className="font-semibold mb-3 flex justify-between">
                  <span>Meeting Details</span>
                  <Button variant="ghost" size="icon" onClick={() => setShowConfirmation(false)}>
                    <Pencil1Icon className="h-4 w-4" />
                  </Button>
                </h3>
                
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Title:</dt>
                    <dd className="font-medium">{meetingDetails.title}</dd>
                  </div>
                  
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Type:</dt>
                    <dd>{meetingDetails.type === "instant" ? "Start Now" : "Scheduled"}</dd>
                  </div>
                  
                  {meetingDetails.type === "scheduled" && meetingDetails.date && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">When:</dt>
                      <dd>{`${format(meetingDetails.date, "PPP")} at ${meetingDetails.time}`}</dd>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Duration:</dt>
                    <dd>{meetingDetails.duration} minutes</dd>
                  </div>
                  
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Participants:</dt>
                    <dd className="text-right max-w-[200px] truncate">{formatParticipantsDisplay()}</dd>
                  </div>
                  
                  {meetingDetails.location && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Location:</dt>
                      <dd>{meetingDetails.location}</dd>
                    </div>
                  )}
                </dl>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950/50 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
                <div className="flex gap-2 items-start">
                  <CheckIcon className="h-5 w-5 text-blue-700 dark:text-blue-300 mt-0.5" />
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    This meeting will be recorded, transcribed, and summarized with AI.
                  </p>
                </div>
              </div>
            </CardContent>
          )}
          
          {showConfirmation && (
            <CardFooter className="flex-col space-y-2">
              <Button className="w-full" onClick={handleCreateMeeting} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : meetingDetails.type === "instant" ? "Start Meeting" : "Schedule Meeting"}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setShowConfirmation(false)}>
                Edit details
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Meeting Created!
            </DialogTitle>
            <DialogDescription>
              Your meeting has been successfully created.
            </DialogDescription>
          </DialogHeader>
          
          {createdMeeting && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">{createdMeeting.title}</h4>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm text-muted-foreground">Access Code:</span>
                  <code className="bg-background px-2 py-1 rounded text-lg font-mono font-bold">
                    {createdMeeting.joinCode}
                  </code>
                  <Button variant="ghost" size="sm" onClick={handleCopyCode}>
                    <CopyIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Invite Results */}
              {inviteResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Invitations
                  </h4>
                  <div className="space-y-1">
                    {inviteResults.map((result, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="truncate max-w-[200px]">{result.email}</span>
                        {result.success ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Sent
                          </span>
                        ) : (
                          <span className="text-red-600 flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Failed
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard")} className="w-full sm:w-auto">
              Back to Dashboard
            </Button>
            <Button onClick={handleGoToMeeting} className="w-full sm:w-auto">
              <Video className="h-4 w-4 mr-2" />
              {createdMeeting?.meetingType === 'INSTANT' ? 'Join Meeting' : 'View Meeting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
