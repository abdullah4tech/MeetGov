"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client"; // shim
import { onboardEnterprise, type EnterpriseMember } from "@/lib/api/enterprise";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Loader2, 
  Building2, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  HelpCircle,
  ArrowLeft,
  ArrowRight
} from "lucide-react";

type Step = 1 | 2 | 3;

interface MemberFormData {
  name: string;
  email: string;
  role: "ADMIN" | "ORGANIZER" | "ASSIGNEE";
}

const ROLE_DESCRIPTIONS = {
  ADMIN: "Full access to organization settings, members, and all meetings",
  ORGANIZER: "Can create and manage meetings, view analytics",
  ASSIGNEE: "Can participate in meetings and complete assigned tasks",
};

const MAX_MEMBERS = 20;

export default function EnterpriseOnboardingPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionLoading } = useSession();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Organization details
  const [orgName, setOrgName] = useState("");
  const [orgDomain, setOrgDomain] = useState("");
  const [orgNameError, setOrgNameError] = useState<string | null>(null);

  // Step 2: Members
  const [members, setMembers] = useState<EnterpriseMember[]>([]);
  const [newMember, setNewMember] = useState<MemberFormData>({
    name: "",
    email: "",
    role: "ASSIGNEE",
  });
  const [memberError, setMemberError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Step 3: Success
  const [createdEnterprise, setCreatedEnterprise] = useState<{
    name: string;
    invitesSent: number;
  } | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isSessionLoading && !session?.user) {
      router.push("/auth/signin?type=enterprise");
    }
  }, [session, isSessionLoading, router]);

  const validateStep1 = (): boolean => {
    if (!orgName.trim()) {
      setOrgNameError("Organization name is required");
      return false;
    }
    if (orgName.length > 100) {
      setOrgNameError("Organization name must be less than 100 characters");
      return false;
    }
    setOrgNameError(null);
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const addMember = () => {
    setMemberError(null);

    if (!newMember.name.trim()) {
      setMemberError("Name is required");
      return;
    }

    if (!newMember.email.trim()) {
      setMemberError("Email is required");
      return;
    }

    if (!validateEmail(newMember.email)) {
      setMemberError("Invalid email address");
      return;
    }

    // Check for duplicate email
    const emailLower = newMember.email.toLowerCase();
    const isDuplicate = members.some(
      (m, i) => m.email.toLowerCase() === emailLower && i !== editingIndex
    );
    if (isDuplicate) {
      setMemberError("This email has already been added");
      return;
    }

    // Check if email is the current user's email
    if (emailLower === session?.user?.email?.toLowerCase()) {
      setMemberError("You cannot add yourself as a member");
      return;
    }

    if (editingIndex !== null) {
      // Update existing member
      const updatedMembers = [...members];
      updatedMembers[editingIndex] = {
        name: newMember.name.trim(),
        email: newMember.email.trim().toLowerCase(),
        role: newMember.role,
      };
      setMembers(updatedMembers);
      setEditingIndex(null);
    } else {
      // Add new member
      if (members.length >= MAX_MEMBERS) {
        setMemberError(`Maximum ${MAX_MEMBERS} members allowed`);
        return;
      }
      setMembers([
        ...members,
        {
          name: newMember.name.trim(),
          email: newMember.email.trim().toLowerCase(),
          role: newMember.role,
        },
      ]);
    }

    // Reset form
    setNewMember({ name: "", email: "", role: "ASSIGNEE" });
  };

  const editMember = (index: number) => {
    const member = members[index];
    setNewMember({
      name: member.name,
      email: member.email,
      role: member.role,
    });
    setEditingIndex(index);
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setNewMember({ name: "", email: "", role: "ASSIGNEE" });
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setNewMember({ name: "", email: "", role: "ASSIGNEE" });
    setMemberError(null);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await onboardEnterprise({
        organizationName: orgName.trim(),
        organizationDomain: orgDomain.trim() || undefined,
        members,
      });

      setCreatedEnterprise({
        name: result.enterprise.name,
        invitesSent: result.invitesSent,
      });
      setCurrentStep(3);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string; details?: Array<{ message: string }> } } };
      const errorMessage = 
        error.response?.data?.details?.[0]?.message ||
        error.response?.data?.error ||
        "Failed to create organization. Please try again.";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToDashboard = () => {
    router.push("/dashboard/enterprise");
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                    step === currentStep
                      ? "bg-primary text-primary-foreground"
                      : step < currentStep
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step < currentStep ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : step === 1 ? (
                    <Building2 className="h-5 w-5" />
                  ) : step === 2 ? (
                    <Users className="h-5 w-5" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                </div>
                {step < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 rounded ${
                      step < currentStep ? "bg-green-500" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-12 mt-2 text-sm text-muted-foreground">
            <span className={currentStep === 1 ? "text-primary font-medium" : ""}>
              Organization
            </span>
            <span className={currentStep === 2 ? "text-primary font-medium" : ""}>
              Team Members
            </span>
            <span className={currentStep === 3 ? "text-primary font-medium" : ""}>
              Complete
            </span>
          </div>
        </div>

        {/* Step 1: Organization Details */}
        {currentStep === 1 && (
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold">
                Set Up Your Organization
              </CardTitle>
              <CardDescription>
                Enter your organization details to get started.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">
                  Organization Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="orgName"
                  placeholder="e.g., Acme Corporation"
                  value={orgName}
                  onChange={(e) => {
                    setOrgName(e.target.value);
                    setOrgNameError(null);
                  }}
                  className={orgNameError ? "border-destructive" : ""}
                  aria-describedby={orgNameError ? "orgName-error" : undefined}
                />
                {orgNameError && (
                  <p id="orgName-error" className="text-sm text-destructive">
                    {orgNameError}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="orgDomain">Organization Domain</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Optional. Used to auto-detect enterprise users based on email domain.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="orgDomain"
                  placeholder="e.g., acme.com"
                  value={orgDomain}
                  onChange={(e) => setOrgDomain(e.target.value)}
                />
              </div>

              <div className="pt-4">
                <Button className="w-full" onClick={handleNextStep}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Add Members */}
        {currentStep === 2 && (
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold">
                Add Team Members
              </CardTitle>
              <CardDescription>
                Invite your team members to join {orgName}. You can add up to {MAX_MEMBERS} members.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Add member form */}
              <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="memberName">Name</Label>
                    <Input
                      id="memberName"
                      placeholder="John Doe"
                      value={newMember.name}
                      onChange={(e) =>
                        setNewMember({ ...newMember, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="memberEmail">Email</Label>
                    <Input
                      id="memberEmail"
                      type="email"
                      placeholder="john@example.com"
                      value={newMember.email}
                      onChange={(e) =>
                        setNewMember({ ...newMember, email: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="memberRole">Role</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-2">
                            <p><strong>Admin:</strong> {ROLE_DESCRIPTIONS.ADMIN}</p>
                            <p><strong>Organizer:</strong> {ROLE_DESCRIPTIONS.ORGANIZER}</p>
                            <p><strong>Participant:</strong> {ROLE_DESCRIPTIONS.ASSIGNEE}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select
                    value={newMember.role}
                    onValueChange={(value: "ADMIN" | "ORGANIZER" | "ASSIGNEE") =>
                      setNewMember({ ...newMember, role: value })
                    }
                  >
                    <SelectTrigger id="memberRole">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="ORGANIZER">Organizer</SelectItem>
                      <SelectItem value="ASSIGNEE">Participant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {memberError && (
                  <p className="text-sm text-destructive">{memberError}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={addMember}
                    disabled={members.length >= MAX_MEMBERS && editingIndex === null}
                  >
                    {editingIndex !== null ? (
                      <>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Update Member
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Member
                      </>
                    )}
                  </Button>
                  {editingIndex !== null && (
                    <Button type="button" variant="outline" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              {/* Members list */}
              {members.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              member.role === "ADMIN"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
                                : member.role === "ORGANIZER"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                            }`}>
                              {member.role === "ASSIGNEE" ? "Participant" : member.role}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => editMember(index)}
                                aria-label={`Edit ${member.name}`}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeMember(index)}
                                className="text-destructive hover:text-destructive"
                                aria-label={`Remove ${member.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {members.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No members added yet.</p>
                  <p className="text-sm">You can add members now or invite them later.</p>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handlePrevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Organization"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Success */}
        {currentStep === 3 && createdEnterprise && (
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Organization Created!
              </CardTitle>
              <CardDescription>
                {createdEnterprise.name} has been set up successfully.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              {createdEnterprise.invitesSent > 0 && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    {createdEnterprise.invitesSent} invitation
                    {createdEnterprise.invitesSent > 1 ? "s have" : " has"} been sent to your team members.
                  </AlertDescription>
                </Alert>
              )}

              <div className="text-center text-muted-foreground">
                <p>You can now start creating meetings and managing your organization.</p>
              </div>

              <Button className="w-full" onClick={goToDashboard}>
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
