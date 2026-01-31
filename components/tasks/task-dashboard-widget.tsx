'use client';

import { useState, useEffect } from 'react';
import { format, isPast } from 'date-fns';
import Link from 'next/link';
import { Task, getMyTasks, taskStatusLabels, taskStatusColors, taskPriorityColors } from '@/lib/api/tasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Calendar,
  ListTodo,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskDashboardWidgetProps {
  limit?: number;
  className?: string;
}

export function TaskDashboardWidget({ limit = 5, className }: TaskDashboardWidgetProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const data = await getMyTasks({ limit });
        setTasks(data);
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
        setError('Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [limit]);

  const pendingCount = tasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length;
  const overdueCount = tasks.filter(t => 
    t.dueDate && isPast(new Date(t.dueDate)) && 
    t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
  ).length;

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            My Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            My Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            My Tasks
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingCount} pending
              </Badge>
            )}
            {overdueCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {overdueCount} overdue
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tasks assigned to you</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {tasks.map((task) => {
                  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && 
                    task.status !== 'COMPLETED' && task.status !== 'CANCELLED';
                  
                  return (
                    <Link 
                      key={task.id} 
                      href={`/meetings/${task.meetingId}?tab=tasks&taskId=${task.id}`}
                      className="block"
                    >
                      <div className={cn(
                        "p-3 rounded-lg border transition-colors hover:bg-accent/50",
                        isOverdue && "border-red-200 bg-red-50/50 dark:bg-red-950/20"
                      )}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{task.title}</p>
                            {task.meeting && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {task.meeting.title}
                              </p>
                            )}
                          </div>
                          <Badge className={cn("text-xs flex-shrink-0", taskStatusColors[task.status])}>
                            {taskStatusLabels[task.status]}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {task.dueDate && (
                            <div className={cn(
                              "flex items-center gap-1",
                              isOverdue && "text-red-600 dark:text-red-400"
                            )}>
                              {isOverdue ? (
                                <AlertTriangle className="h-3 w-3" />
                              ) : (
                                <Calendar className="h-3 w-3" />
                              )}
                              <span>{format(new Date(task.dueDate), 'MMM d')}</span>
                            </div>
                          )}
                          {task.priority && task.priority !== 'MEDIUM' && (
                            <Badge className={cn(
                              "text-xs h-5",
                              taskPriorityColors[task.priority as keyof typeof taskPriorityColors]
                            )}>
                              {task.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </ScrollArea>
            
            <div className="mt-4 pt-4 border-t">
              <Link href="/dashboard/tasks">
                <Button variant="ghost" size="sm" className="w-full">
                  View all tasks
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
