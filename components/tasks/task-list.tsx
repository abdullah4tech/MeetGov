'use client';

import { useState, useEffect } from 'react';
import { Task, TaskStatus, listMeetingTasks, taskStatusLabels } from '@/lib/api/tasks';
import { TaskCard } from './task-card';
import { TaskModal } from './task-modal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ListFilter, CheckCircle2, Clock, Send, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskListProps {
  meetingId: string;
  currentUserId?: string;
  onTaskUpdate?: () => void;
}

export function TaskList({ meetingId, currentUserId, onTaskUpdate }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedTasks = await listMeetingTasks(meetingId);
      setTasks(fetchedTasks);
    } catch (err) {
      setError('Failed to load tasks');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [meetingId]);

  const handleTaskCreated = () => {
    setIsCreateModalOpen(false);
    fetchTasks();
    onTaskUpdate?.();
  };

  const handleTaskUpdated = () => {
    setEditingTask(null);
    fetchTasks();
    onTaskUpdate?.();
  };

  const handleTaskDeleted = () => {
    fetchTasks();
    onTaskUpdate?.();
  };

  const filterTasks = (status?: TaskStatus) => {
    if (!status || status === ('all' as any)) return tasks;
    return tasks.filter(task => task.status === status);
  };

  const getTaskCounts = () => {
    return {
      all: tasks.length,
      PENDING: tasks.filter(t => t.status === 'PENDING').length,
      IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      SUBMITTED: tasks.filter(t => t.status === 'SUBMITTED').length,
      COMPLETED: tasks.filter(t => t.status === 'COMPLETED').length,
    };
  };

  const counts = getTaskCounts();

  const tabConfig = [
    { value: 'all', label: 'All', count: counts.all, icon: ListFilter },
    { value: 'PENDING', label: 'Pending', count: counts.PENDING, icon: Clock },
    { value: 'IN_PROGRESS', label: 'In Progress', count: counts.IN_PROGRESS, icon: AlertCircle },
    { value: 'SUBMITTED', label: 'Submitted', count: counts.SUBMITTED, icon: Send },
    { value: 'COMPLETED', label: 'Completed', count: counts.COMPLETED, icon: CheckCircle2 },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Tasks</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Tasks</h3>
        </div>
        <div className="text-center py-8 text-destructive">
          <p>{error}</p>
          <Button variant="outline" onClick={fetchTasks} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tasks ({tasks.length})</h3>
        <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Task
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          {tabConfig.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-1.5 text-xs py-2"
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count > 0 && (
                <span className={cn(
                  "ml-1 px-1.5 py-0.5 rounded-full text-xs",
                  activeTab === tab.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabConfig.map(tab => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            {filterTasks(tab.value === 'all' ? undefined : tab.value as TaskStatus).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <tab.icon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No {tab.value === 'all' ? '' : tab.label.toLowerCase()} tasks</p>
                {tab.value === 'all' && (
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="mt-4"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create your first task
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filterTasks(tab.value === 'all' ? undefined : tab.value as TaskStatus).map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    currentUserId={currentUserId}
                    onEdit={() => setEditingTask(task)}
                    onDeleted={handleTaskDeleted}
                    onStatusChange={fetchTasks}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <TaskModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        meetingId={meetingId}
        onSuccess={handleTaskCreated}
      />

      {editingTask && (
        <TaskModal
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          meetingId={meetingId}
          task={editingTask}
          onSuccess={handleTaskUpdated}
        />
      )}
    </div>
  );
}
