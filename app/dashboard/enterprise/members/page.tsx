"use client";

import { useEffect, useState, useCallback } from "react";
import { useDashboard } from "@/components/dashboard";
import { 
  getEnterpriseMembers, 
  resendInvite, 
  inviteMember,
  updateMemberRole,
  removeMember,
  cancelInvite,
  type GetMembersResponse,
  type InviteMemberRequest,
} from "@/lib/api/enterprise";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { 
  Users,
  UserPlus,
  Search,
  MoreHorizontal,
  Mail,
  Shield,
  Trash2,
  UserCog,
  RefreshCw,
  Clock,
} from "lucide-react";

export default function EnterpriseMembersPage() {
  const { user } = useDashboard();
  const { toast } = useToast();
  const [membersData, setMembersData] = useState<GetMembersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("members");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ORGANIZER" | "ASSIGNEE">("ASSIGNEE");
  const [isInviting, setIsInviting] = useState(false);

  const isAdmin = user?.enterprise?.role === "ADMIN";
  const canManageMembers = isAdmin || user?.enterprise?.role === "ORGANIZER";

  const fetchMembers = useCallback(async () => {
    if (!canManageMembers) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await getEnterpriseMembers();
      setMembersData(response);
    } catch (err) {
      console.error("Failed to fetch members:", err);
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [canManageMembers, toast]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleResendInvite = async (inviteId: string) => {
    try {
      await resendInvite(inviteId);
      toast({
        title: "Invite Resent",
        description: "The invitation has been resent successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to resend invitation",
        variant: "destructive",
      });
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;
    
    setIsInviting(true);
    try {
      await inviteMember({
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${inviteEmail}`,
      });
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("ASSIGNEE");
      fetchMembers();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.error || "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: "ORGANIZER" | "ASSIGNEE") => {
    try {
      await updateMemberRole(memberId, { role: newRole });
      toast({
        title: "Role Updated",
        description: "Member role has been updated successfully",
      });
      fetchMembers();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.error || "Failed to update role",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMember(memberId);
      toast({
        title: "Member Removed",
        description: "Member has been removed from the organization",
      });
      fetchMembers();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.error || "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await cancelInvite(inviteId);
      toast({
        title: "Invite Cancelled",
        description: "The invitation has been cancelled",
      });
      fetchMembers();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.error || "Failed to cancel invitation",
        variant: "destructive",
      });
    }
  };

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

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Admin";
      case "ORGANIZER":
        return "Organizer";
      case "ASSIGNEE":
        return "Participant";
      default:
        return role;
    }
  };

  const filteredMembers = membersData?.members.filter(member => {
    const matchesSearch = 
      member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }) || [];

  const filteredInvites = membersData?.pendingInvites.filter(invite => {
    return invite.email.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const membersByRole = {
    admins: filteredMembers.filter(m => m.role === "ADMIN"),
    organizers: filteredMembers.filter(m => m.role === "ORGANIZER"),
    participants: filteredMembers.filter(m => m.role === "ASSIGNEE"),
  };

  if (!canManageMembers) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground">
          You don't have permission to manage team members.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Members</h1>
          <p className="text-muted-foreground">
            Manage your organization's team members and invitations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchMembers} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your organization.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "ORGANIZER" | "ASSIGNEE")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASSIGNEE">Participant</SelectItem>
                      <SelectItem value="ORGANIZER">Organizer</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {inviteRole === "ORGANIZER" 
                      ? "Organizers can create meetings and manage tasks"
                      : "Participants can view and complete assigned tasks"}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInviteMember} disabled={!inviteEmail || isInviting}>
                  {isInviting ? "Sending..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold">{membersData?.members.length || 0}</p>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold">{membersByRole.admins.length}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Organizers</p>
                <p className="text-2xl font-bold">{membersByRole.organizers.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <UserCog className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Invites</p>
                <p className="text-2xl font-bold">{membersData?.pendingInvites.length || 0}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Directory</CardTitle>
              <CardDescription>
                {membersData?.enterprise.name || "Organization"} members
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="members">
                Active ({membersData?.members.length || 0})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({membersData?.pendingInvites.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No members found</p>
                  <p className="text-sm">Try adjusting your search query</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Status</TableHead>
                      {isAdmin && <TableHead className="w-[50px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={member.image || undefined} />
                              <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.name || "Unknown"}</p>
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeStyle(member.role)}>
                            {getRoleDisplayName(member.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.joinedAt 
                            ? new Date(member.joinedAt).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                            Active
                          </Badge>
                        </TableCell>
                        {isAdmin && member.role !== "ADMIN" && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => handleUpdateRole(
                                    member.id, 
                                    member.role === "ORGANIZER" ? "ASSIGNEE" : "ORGANIZER"
                                  )}
                                >
                                  <UserCog className="h-4 w-4 mr-2" />
                                  {member.role === "ORGANIZER" ? "Demote to Participant" : "Promote to Organizer"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleRemoveMember(member.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove Member
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                        {isAdmin && member.role === "ADMIN" && (
                          <TableCell></TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="pending">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-48" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              ) : filteredInvites.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No pending invitations</p>
                  <p className="text-sm">Invite team members to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Expires</TableHead>
                      {isAdmin && <TableHead className="w-[50px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-muted">
                                <Mail className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <p className="text-muted-foreground">{invite.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeStyle(invite.role)}>
                            {getRoleDisplayName(invite.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(invite.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(invite.expiresAt).toLocaleDateString()}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleResendInvite(invite.id)}>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Resend Invite
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleCancelInvite(invite.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Cancel Invite
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
