"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Check, X, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import type { DashboardNotification } from "@/hooks/use-dashboard-notifications";

interface NotificationBellProps {
  notifications: DashboardNotification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClear: () => void;
}

export function NotificationBell({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClear,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);

  const getNotificationIcon = (type: DashboardNotification["type"]) => {
    switch (type) {
      case "task":
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
        );
      case "meeting":
        return (
          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Bell className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Bell className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </div>
        );
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 hover:bg-red-500"
              aria-hidden="true"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={onMarkAllAsRead}
                aria-label="Mark all notifications as read"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={onClear}
                aria-label="Clear all notifications"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  className={`w-full text-left p-3 hover:bg-muted/50 transition-colors focus:outline-none focus:bg-muted/50 ${
                    !notification.read ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                  }`}
                  onClick={() => onMarkAsRead(notification.id)}
                  aria-label={`${notification.read ? "" : "Unread: "}${notification.title}`}
                >
                  <div className="flex gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium truncate ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" aria-hidden="true" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
