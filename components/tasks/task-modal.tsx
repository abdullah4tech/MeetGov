'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Task,
  TaskPriority,
  CreateTaskInput,
  UpdateTaskInput,
  MeetingParticipant,
  createTask,
  updateTask,
  getMeetingParticipants,
} from '@/lib/api/tasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
  task?: Task;
  onSuccess?: () => void;
}

export function TaskModal({
  open,
  onOpenChange,
  meetingId,
  task,
  onSuccess,
}: TaskModalProps) {
  const isEditing = !!task;
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToUserId, setAssignedToUserId] = useState<string>('');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or task changes
  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title);
        setDescription(task.description || '');
        setAssignedToUserId(task.assignedToUserId || '');
        setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
        setPriority((task.priority as TaskPriority) || 'MEDIUM');
      } else {
        setTitle('');
        setDescription('');
        setAssignedToUserId('');
        setDueDate(undefined);
        setPriority('MEDIUM');
      }
      setError(null);
      fetchParticipants();
    }
  }, [open, task]);

  const fetchParticipants = async () => {
    try {
      setLoadingParticipants(true);
      const data = await getMeetingParticipants(meetingId);
      setParticipants(data);
    } catch (err) {
      console.error('Failed to fetch participants:', err);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const selectedParticipant = participants.find(p => p.id === assignedToUserId);

      if (isEditing && task) {
        const updateInput: UpdateTaskInput = {
          title: title.trim(),
          description: description.trim() || undefined,
          assignedToUserId: assignedToUserId || undefined,
          assigneeEmail: selectedParticipant?.email,
          assigneeName: selectedParticipant?.name || selectedParticipant?.email,
          dueDate: dueDate?.toISOString(),
          priority,
        };
        await updateTask(task.id, updateInput);
      } else {
        const createInput: CreateTaskInput = {
          title: title.trim(),
          description: description.trim() || undefined,
          assignedToUserId: assignedToUserId || undefined,
          assigneeEmail: selectedParticipant?.email,
          assigneeName: selectedParticipant?.name || selectedParticipant?.email,
          dueDate: dueDate?.toISOString(),
          priority,
        };
        await createTask(meetingId, createInput);
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to save task:', err);
      setError(err.response?.data?.error || 'Failed to save task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Task' : 'Create Task'}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update the task details below.'
                : 'Create a new task for this meeting.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter task description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignee">Assign To</Label>
              <Select
                value={assignedToUserId}
                onValueChange={setAssignedToUserId}
                disabled={isSubmitting || loadingParticipants}
              >
                <SelectTrigger id="assignee">
                  <SelectValue placeholder={loadingParticipants ? "Loading..." : "Select assignee (optional)"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {participants.map((participant) => (
                    <SelectItem key={participant.id} value={participant.id}>
                      {participant.name || participant.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                      disabled={isSubmitting}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(value) => setPriority(value as TaskPriority)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
