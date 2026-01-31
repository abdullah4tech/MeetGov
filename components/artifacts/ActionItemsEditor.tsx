"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MeetingArtifact,
  ActionItem,
  parseActionItems,
  serializeActionItems,
} from "@/lib/api/transcript";

interface ActionItemsEditorProps {
  artifact: MeetingArtifact;
  isEditing: boolean;
  editingContent?: string;
  onEditChange: (content: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function ActionItemsEditor({
  artifact,
  isEditing,
  editingContent,
  onEditChange,
  onSave,
  onCancel,
  isSaving,
}: ActionItemsEditorProps) {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [viewMode, setViewMode] = useState<"structured" | "raw">("structured");

  // Parse items from content
  useEffect(() => {
    const content = isEditing ? editingContent : artifact.content;
    if (content) {
      const parsed = parseActionItems(content);
      if (parsed.length > 0) {
        setItems(parsed);
      }
    }
  }, [artifact.content, isEditing, editingContent]);

  // Sync items back to content when they change
  const syncItemsToContent = (newItems: ActionItem[]) => {
    setItems(newItems);
    const serialized = serializeActionItems(newItems);
    onEditChange(serialized);
  };

  // Handle item field change
  const handleItemChange = (
    itemId: string,
    field: keyof ActionItem,
    value: string | boolean
  ) => {
    const newItems = items.map((item) =>
      item.id === itemId ? { ...item, [field]: value } : item
    );
    syncItemsToContent(newItems);
  };

  // Add new item
  const handleAddItem = () => {
    const newItem: ActionItem = {
      id: `item-${Date.now()}`,
      task: "",
      assignee: "TBD",
      dueDate: "TBD",
      priority: "MEDIUM",
      completed: false,
    };
    syncItemsToContent([...items, newItem]);
  };

  // Remove item
  const handleRemoveItem = (itemId: string) => {
    const newItems = items.filter((item) => item.id !== itemId);
    syncItemsToContent(newItems);
  };

  // Priority badge colors
  const priorityColors: Record<string, string> = {
    HIGH: "bg-red-500/10 text-red-600",
    MEDIUM: "bg-amber-500/10 text-amber-600",
    LOW: "bg-green-500/10 text-green-600",
  };

  // Raw text view
  if (viewMode === "raw") {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("structured")}
          >
            Switch to Structured View
          </Button>
        </div>
        <Textarea
          value={isEditing ? editingContent : artifact.content || ""}
          onChange={(e) => onEditChange(e.target.value)}
          onFocus={() => {
            if (!isEditing && artifact.content) {
              onEditChange(artifact.content);
            }
          }}
          className="min-h-[200px] font-mono text-sm resize-y"
          placeholder="No action items"
        />
        {isEditing && (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button size="sm" onClick={onSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Structured view
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          {items.length} action item{items.length !== 1 ? "s" : ""}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode("raw")}
        >
          Switch to Raw View
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-6 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground text-sm mb-3">
            No action items found
          </p>
          <Button variant="outline" size="sm" onClick={handleAddItem}>
            Add Action Item
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="border rounded-lg p-4 space-y-3 bg-card"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    #{index + 1}
                  </span>
                  <Badge className={priorityColors[item.priority]}>
                    {item.priority}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveItem(item.id)}
                  title="Remove item"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Task Description
                </label>
                <Input
                  value={item.task}
                  onChange={(e) => handleItemChange(item.id, "task", e.target.value)}
                  onFocus={() => {
                    if (!isEditing) {
                      onEditChange(artifact.content || "");
                    }
                  }}
                  placeholder="Enter task description..."
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Assignee
                  </label>
                  <Input
                    value={item.assignee}
                    onChange={(e) =>
                      handleItemChange(item.id, "assignee", e.target.value)
                    }
                    onFocus={() => {
                      if (!isEditing) {
                        onEditChange(artifact.content || "");
                      }
                    }}
                    placeholder="Who is responsible?"
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Due Date
                  </label>
                  <Input
                    value={item.dueDate}
                    onChange={(e) =>
                      handleItemChange(item.id, "dueDate", e.target.value)
                    }
                    onFocus={() => {
                      if (!isEditing) {
                        onEditChange(artifact.content || "");
                      }
                    }}
                    placeholder="When is it due?"
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Priority
                  </label>
                  <Select
                    value={item.priority}
                    onValueChange={(value) => {
                      if (!isEditing) {
                        onEditChange(artifact.content || "");
                      }
                      handleItemChange(item.id, "priority", value);
                    }}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="w-full"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Action Item
          </Button>
        </div>
      )}

      {isEditing && (
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button size="sm" onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}
