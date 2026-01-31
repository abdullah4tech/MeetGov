"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/components/dashboard";
import { 
  getOrganizationSettings, 
  updateOrganizationSettings, 
  deleteOrganization,
  type OrganizationSettings as OrgSettingsResponse,
} from "@/lib/api/enterprise";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Building2,
  Shield,
  Settings,
  Globe,
  Bell,
  Lock,
  Palette,
  Upload,
  Save,
  AlertTriangle,
  CheckCircle2,
  Users,
  Video,
  FileText,
  Loader2,
} from "lucide-react";

interface LocalSettings {
  name: string;
  domain: string | null;
  logoUrl: string | null;
  description: string;
  website: string;
  timezone: string;
  allowPublicMeetings: boolean;
  requireMeetingApproval: boolean;
  autoAssignTasks: boolean;
  emailNotifications: boolean;
  slackIntegration: boolean;
}

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const { user } = useDashboard();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [orgData, setOrgData] = useState<OrgSettingsResponse | null>(null);
  
  const [settings, setSettings] = useState<LocalSettings>({
    name: "",
    domain: null,
    logoUrl: null,
    description: "",
    website: "",
    timezone: "America/New_York",
    allowPublicMeetings: false,
    requireMeetingApproval: false,
    autoAssignTasks: true,
    emailNotifications: true,
    slackIntegration: false,
  });

  const isAdmin = user?.enterprise?.role === "ADMIN";

  const fetchSettings = useCallback(async () => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await getOrganizationSettings();
      setOrgData(data);
      setSettings(prev => ({
        ...prev,
        name: data.name,
        domain: data.domain,
      }));
    } catch (err) {
      console.error("Failed to fetch settings:", err);
      toast({
        title: "Error",
        description: "Failed to load organization settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateOrganizationSettings({
        name: settings.name,
        domain: settings.domain,
      });
      toast({
        title: "Settings Saved",
        description: "Organization settings have been updated successfully.",
      });
      fetchSettings();
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOrganization = async () => {
    setIsDeleting(true);
    try {
      await deleteOrganization();
      toast({
        title: "Organization Deleted",
        description: "Your organization has been permanently deleted.",
      });
      router.push("/dashboard");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.error || "Failed to delete organization",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground">
          Only administrators can manage organization settings.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Organization Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your organization's configuration and preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Organization Overview */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={settings.logoUrl || undefined} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {settings.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{settings.name}</h2>
              <p className="text-muted-foreground">
                {settings.domain || "No domain configured"}
              </p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">
                  <Users className="h-3 w-3 mr-1" />
                  Enterprise Plan
                </Badge>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>
            </div>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Upload Logo
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="meetings" className="gap-2">
            <Video className="h-4 w-4" />
            Meetings
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Details</CardTitle>
                <CardDescription>
                  Basic information about your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Organization Name</Label>
                    <Input
                      id="name"
                      value={settings.name}
                      onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                      placeholder="Your Organization"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="domain">Domain</Label>
                    <Input
                      id="domain"
                      value={settings.domain || ""}
                      onChange={(e) => setSettings({ ...settings, domain: e.target.value })}
                      placeholder="yourcompany.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={settings.description}
                    onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                    placeholder="Brief description of your organization"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={settings.website}
                      onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                      placeholder="https://yourcompany.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      value={settings.timezone}
                      onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                      placeholder="America/New_York"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Branding
                </CardTitle>
                <CardDescription>
                  Customize how your organization appears
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-2">Organization Logo</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload a logo to personalize your organization. Recommended size: 256x256px
                    </p>
                    <Button variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </Button>
                  </div>
                  <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                    <Building2 className="h-12 w-12" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="meetings">
          <Card>
            <CardHeader>
              <CardTitle>Meeting Settings</CardTitle>
              <CardDescription>
                Configure default settings for meetings in your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Public Meetings</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow meetings to be accessible to anyone with the link
                  </p>
                </div>
                <Switch
                  checked={settings.allowPublicMeetings}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, allowPublicMeetings: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Require Meeting Approval</Label>
                  <p className="text-sm text-muted-foreground">
                    Admins must approve meetings before they can be scheduled
                  </p>
                </div>
                <Switch
                  checked={settings.requireMeetingApproval}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, requireMeetingApproval: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto-Assign Tasks</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically assign extracted tasks to meeting participants
                  </p>
                </div>
                <Switch
                  checked={settings.autoAssignTasks}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, autoAssignTasks: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Manage how your organization receives notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send email notifications for meetings and tasks
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, emailNotifications: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Slack Integration</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications to Slack channels
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Coming Soon</Badge>
                  <Switch
                    checked={settings.slackIntegration}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, slackIntegration: checked })
                    }
                    disabled
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage security and access controls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require 2FA for all organization members
                    </p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">SSO Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable Single Sign-On for your organization
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Enterprise Only</Badge>
                    <Switch disabled />
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Session Timeout</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically log out users after inactivity
                    </p>
                  </div>
                  <Input className="w-32" type="number" defaultValue={60} min={15} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Irreversible and destructive actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg">
                  <div>
                    <p className="font-medium">Delete Organization</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your organization and all its data
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={isDeleting}>
                        {isDeleting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          "Delete Organization"
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your
                          organization, all members, meetings, tasks, and associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={handleDeleteOrganization}
                        >
                          Delete Organization
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
