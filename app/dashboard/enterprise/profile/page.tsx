"use client";

import { useState } from "react";
import { useDashboard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  User,
  Building2,
  Bell,
  Shield,
  Save,
  Loader2,
} from "lucide-react";

export default function EnterpriseProfilePage() {
  const { user } = useDashboard();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    taskReminders: true,
    meetingReminders: true,
    teamUpdates: true,
  });

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      case "ORGANIZER":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast({
      title: "Profile updated",
      description: "Your changes have been saved successfully.",
    });
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account and organization settings</p>
      </div>

      <div className="space-y-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.image || undefined} alt={user?.name || "User"} />
                <AvatarFallback className="text-2xl">{getInitials(user?.name)}</AvatarFallback>
              </Avatar>
              <div>
                <Button variant="outline" size="sm">Change Photo</Button>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG or GIF. Max 2MB.</p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter your email"
                  disabled
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization
            </CardTitle>
            <CardDescription>Your organization details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Organization Name</p>
                <p className="text-sm text-muted-foreground">{user?.enterprise?.name || "Unknown"}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Your Role</p>
                <p className="text-sm text-muted-foreground">Your permissions within the organization</p>
              </div>
              <Badge className={getRoleBadgeStyle(user?.enterprise?.role || "")}>
                {user?.enterprise?.role === "ASSIGNEE" ? "Participant" : user?.enterprise?.role}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>Configure how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive email updates about your account</p>
              </div>
              <Switch
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, emailNotifications: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Task Reminders</p>
                <p className="text-sm text-muted-foreground">Get notified about upcoming task deadlines</p>
              </div>
              <Switch
                checked={preferences.taskReminders}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, taskReminders: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Meeting Reminders</p>
                <p className="text-sm text-muted-foreground">Get notified before scheduled meetings</p>
              </div>
              <Switch
                checked={preferences.meetingReminders}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, meetingReminders: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Team Updates</p>
                <p className="text-sm text-muted-foreground">Get notified about team activity and changes</p>
              </div>
              <Switch
                checked={preferences.teamUpdates}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, teamUpdates: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Security
            </CardTitle>
            <CardDescription>Manage your account security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Password</p>
                <p className="text-sm text-muted-foreground">Last changed: Never</p>
              </div>
              <Button variant="outline" size="sm">Change Password</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
              </div>
              <Button variant="outline" size="sm">Enable</Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
