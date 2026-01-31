'use client';

import { useState } from 'react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import {
  Task,
  TaskStatus,
  updateTask,
  deleteTask,
  taskStatusLabels,
  taskStatusColors,
  taskPriorityLabels,
  taskPriorityColors,
} from '@/lib/api/tasks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  Calendar,
  User,
  FileText,
  Upload,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskSubmissionForm } from './task-submission-form';

interface TaskCardProps {
  task: Task;
  currentUserId?: string;
  onEdit?: () => void;
  onDeleted?: () => void;
  onStatusChange?: () => void;
}

export function TaskCard({
  task,
  currentUserId,
  onEdit,
  onDeleted,
  onStatusChange,
}: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);

  const isCreator = currentUserId === task.createdByUserId;
  const isAssignee = currentUserId === task.assignedToUserId;
  const canEdit = isCreator || isAssignee;
  const canDelete = isCreator;
  const canSubmit = isAssignee && task.status !== 'COMPLETED' && task.status !== 'CANCELLED';

  const isDueSoon = task.dueDate && !isPast(new Date(task.dueDate)) && 
    new Date(task.dueDate).getTime() - Date.now() < 24 * 60 * 60 * 1000;
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && 
    task.status !== 'COMPLETED' && task.status !== 'CANCELLED';

  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      setIsUpdatingStatus(true);
      await updateTask(task.id, { status: newStatus });
      onStatusChange?.();
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteTask(task.id);
      onDeleted?.();
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const getAssigneeName = () => {
    if (task.assignedToUser) {
      return task.assignedToUser.name || task.assignedToUser.email;
    }
    return task.assignee || task.assigneeEmail || 'Unassigned';
  };

  const getCreatorName = () => {
    if (task.createdByUser) {
      return task.createdByUser.name || task.createdByUser.email;
    }
    return 'Unknown';
  };

  return (
    <>
      <Card className={cn(
        "transition-all",
        isOverdue && "border-red-300 bg-red-50/50 dark:bg-red-950/20",
        isDueSoon && !isOverdue && "border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20"
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium truncate">{task.title}</h4>
                <Badge className={cn("text-xs", taskStatusColors[task.status])}>
                  {taskStatusLabels[task.status]}
                </Badge>
                {task.priority && task.priority !== 'MEDIUM' && (
                  <Badge className={cn("text-xs", taskPriorityColors[task.priority as keyof typeof taskPriorityColors])}>
                    {taskPriorityLabels[task.priority as keyof typeof taskPriorityLabels]}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {canSubmit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSubmissionForm(!showSubmissionForm)}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Submit
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  
                  {task.status !== 'COMPLETED' && canEdit && (
                    <DropdownMenuItem
                      onClick={() => handleStatusChange('COMPLETED')}
                      disabled={isUpdatingStatus}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Complete
                    </DropdownMenuItem>
                  )}
                  
                  {task.status === 'PENDING' && canEdit && (
                    <DropdownMenuItem
                      onClick={() => handleStatusChange('IN_PROGRESS')}
                      disabled={isUpdatingStatus}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Start Progress
                    </DropdownMenuItem>
                  )}
                  
                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-2">
            {/* Meta info */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                <span>{getAssigneeName()}</span>
              </div>
              
              {task.dueDate && (
                <div className={cn(
                  "flex items-center gap-1",
                  isOverdue && "text-red-600 dark:text-red-400",
                  isDueSoon && !isOverdue && "text-yellow-600 dark:text-yellow-400"
                )}>
                  {isOverdue && <AlertTriangle className="h-3.5 w-3.5" />}
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {isOverdue ? 'Overdue: ' : ''}
                    {format(new Date(task.dueDate), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
              
              {task.submissions && task.submissions.length > 0 && (
                <div className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  <span>{task.submissions.length} submission{task.submissions.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
            
            {/* Description preview */}
            {task.description && (
              <div>
                <p className={cn(
                  "text-sm text-muted-foreground",
                  !isExpanded && "line-clamp-2"
                )}>
                  {task.description}
                </p>
                {task.description.length > 100 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3 mr-1" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Show more
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
            
            {/* Submission form */}
            {showSubmissionForm && (
              <div className="mt-4 pt-4 border-t">
                <TaskSubmissionForm
                  taskId={task.id}
                  onSuccess={() => {
                    setShowSubmissionForm(false);
                    onStatusChange?.();
                  }}
                  onCancel={() => setShowSubmissionForm(false)}
                />
              </div>
            )}
            
            {/* Created by info */}
            <div className="text-xs text-muted-foreground pt-2 border-t mt-2">
              Created by {getCreatorName()} • {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
