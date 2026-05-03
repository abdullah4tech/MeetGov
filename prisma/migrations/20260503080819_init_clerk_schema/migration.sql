-- CreateEnum
CREATE TYPE "EnterpriseRole" AS ENUM ('ADMIN', 'ORGANIZER', 'ASSIGNEE');

-- CreateEnum
CREATE TYPE "EnterpriseInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ParticipantInviteStatus" AS ENUM ('PENDING', 'USED', 'REVOKED');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('WAITING', 'SCHEDULED', 'LIVE', 'ACTIVE', 'ENDED', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('IDLE', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('PERSONAL', 'GUEST', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "GuestUsageState" AS ENUM ('ACTIVE', 'EXHAUSTED');

-- CreateEnum
CREATE TYPE "GuestConversionState" AS ENUM ('NONE', 'PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'SUBMITTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AiJobType" AS ENUM ('SUMMARY', 'MINUTES', 'ACTION_ITEMS');

-- CreateEnum
CREATE TYPE "AiJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MeetingArtifactType" AS ENUM ('SUMMARY', 'MINUTES', 'ACTION_ITEMS');

-- CreateEnum
CREATE TYPE "MeetingArtifactStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enterprise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enterprise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseInvite" (
    "id" TEXT NOT NULL,
    "enterpriseId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "EnterpriseRole" NOT NULL,
    "inviteToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "EnterpriseInviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,

    CONSTRAINT "EnterpriseInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enterpriseId" TEXT NOT NULL,
    "role" "EnterpriseRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantSession" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "meetingId" TEXT,
    "inviteId" TEXT,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantInvite" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "inviteToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "ParticipantInviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usageState" "GuestUsageState" NOT NULL DEFAULT 'ACTIVE',
    "workflowCount" INTEGER NOT NULL DEFAULT 0,
    "firstWorkflowCompletedAt" TIMESTAMP(3),
    "exhaustedAt" TIMESTAMP(3),
    "conversionState" "GuestConversionState" NOT NULL DEFAULT 'NONE',
    "conversionDeadlineAt" TIMESTAMP(3),
    "conversionDecidedAt" TIMESTAMP(3),
    "hasUsedPlatform" BOOLEAN NOT NULL DEFAULT false,
    "browserFingerprint" TEXT,
    "modalDismissCount" INTEGER NOT NULL DEFAULT 0,
    "firstDismissedAt" TIMESTAMP(3),

    CONSTRAINT "GuestSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'IDLE',
    "processingError" TEXT,
    "scheduledStart" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "recordingStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "recordingPausedAt" TIMESTAMP(3),
    "recordingResumedAt" TIMESTAMP(3),
    "workflowCompletedAt" TIMESTAMP(3),
    "isReadOnly" BOOLEAN NOT NULL DEFAULT false,
    "ownerType" "OwnerType" NOT NULL DEFAULT 'GUEST',
    "ownerId" TEXT NOT NULL,
    "invitedParticipants" JSONB,
    "enterpriseId" TEXT,
    "guestSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "trackingCode" TEXT,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "ownerType" "OwnerType" NOT NULL DEFAULT 'GUEST',
    "ownerId" TEXT,
    "guestSessionId" TEXT,
    "participantId" TEXT,
    "participantName" TEXT NOT NULL,
    "participantEmail" TEXT,
    "role" TEXT DEFAULT 'ATTENDEE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "lateByMinutes" INTEGER,
    "checkedInAt" TIMESTAMP(3),
    "checkedInVia" TEXT DEFAULT 'MANUAL',

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceToken" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AttendanceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recording" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "fileUrl" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "duration" INTEGER,
    "processingStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transcript" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "source" TEXT NOT NULL DEFAULT 'AI',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transcript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptSegment" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "speakerLabel" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranscriptSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingSummary" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "keyPoints" JSONB,
    "decisions" JSONB,
    "aiModel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingMinutes" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'MARKDOWN',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingMinutes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "ownerType" "OwnerType" NOT NULL DEFAULT 'GUEST',
    "ownerId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "assignedToUserId" TEXT,
    "enterpriseId" TEXT,
    "guestSessionId" TEXT,
    "participantId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignee" TEXT,
    "assigneeEmail" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" TEXT DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskSubmissionToken" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "TaskSubmissionToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskSubmission" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "notes" TEXT,
    "submittedByType" TEXT,
    "submittedByUserId" TEXT,
    "submittedByParticipantId" TEXT,
    "submittedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskSubmissionFile" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "objectName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "originalFileName" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskSubmissionFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiJob" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "type" "AiJobType" NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'PENDING',
    "bullmqJobId" TEXT,
    "errorMessage" TEXT,
    "transcriptSnapshotId" TEXT,
    "aiModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AiJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptSnapshot" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranscriptSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingArtifact" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "type" "MeetingArtifactType" NOT NULL,
    "content" TEXT,
    "status" "MeetingArtifactStatus" NOT NULL DEFAULT 'PENDING',
    "aiJobId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Enterprise_domain_key" ON "Enterprise"("domain");

-- CreateIndex
CREATE INDEX "Enterprise_domain_idx" ON "Enterprise"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseInvite_inviteToken_key" ON "EnterpriseInvite"("inviteToken");

-- CreateIndex
CREATE INDEX "EnterpriseInvite_enterpriseId_idx" ON "EnterpriseInvite"("enterpriseId");

-- CreateIndex
CREATE INDEX "EnterpriseInvite_email_idx" ON "EnterpriseInvite"("email");

-- CreateIndex
CREATE INDEX "EnterpriseInvite_inviteToken_idx" ON "EnterpriseInvite"("inviteToken");

-- CreateIndex
CREATE INDEX "EnterpriseInvite_status_idx" ON "EnterpriseInvite"("status");

-- CreateIndex
CREATE INDEX "EnterpriseInvite_expiresAt_idx" ON "EnterpriseInvite"("expiresAt");

-- CreateIndex
CREATE INDEX "EnterpriseMembership_userId_idx" ON "EnterpriseMembership"("userId");

-- CreateIndex
CREATE INDEX "EnterpriseMembership_enterpriseId_idx" ON "EnterpriseMembership"("enterpriseId");

-- CreateIndex
CREATE INDEX "EnterpriseMembership_enterpriseId_role_idx" ON "EnterpriseMembership"("enterpriseId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseMembership_userId_enterpriseId_key" ON "EnterpriseMembership"("userId", "enterpriseId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_email_key" ON "Participant"("email");

-- CreateIndex
CREATE INDEX "Participant_email_idx" ON "Participant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantSession_token_key" ON "ParticipantSession"("token");

-- CreateIndex
CREATE INDEX "ParticipantSession_participantId_idx" ON "ParticipantSession"("participantId");

-- CreateIndex
CREATE INDEX "ParticipantSession_meetingId_idx" ON "ParticipantSession"("meetingId");

-- CreateIndex
CREATE INDEX "ParticipantSession_inviteId_idx" ON "ParticipantSession"("inviteId");

-- CreateIndex
CREATE INDEX "ParticipantSession_token_idx" ON "ParticipantSession"("token");

-- CreateIndex
CREATE INDEX "ParticipantSession_expiresAt_idx" ON "ParticipantSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantInvite_inviteToken_key" ON "ParticipantInvite"("inviteToken");

-- CreateIndex
CREATE INDEX "ParticipantInvite_participantId_idx" ON "ParticipantInvite"("participantId");

-- CreateIndex
CREATE INDEX "ParticipantInvite_meetingId_idx" ON "ParticipantInvite"("meetingId");

-- CreateIndex
CREATE INDEX "ParticipantInvite_inviteToken_idx" ON "ParticipantInvite"("inviteToken");

-- CreateIndex
CREATE INDEX "ParticipantInvite_expiresAt_idx" ON "ParticipantInvite"("expiresAt");

-- CreateIndex
CREATE INDEX "ParticipantInvite_status_idx" ON "ParticipantInvite"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GuestSession_token_key" ON "GuestSession"("token");

-- CreateIndex
CREATE INDEX "GuestSession_token_idx" ON "GuestSession"("token");

-- CreateIndex
CREATE INDEX "GuestSession_expiresAt_idx" ON "GuestSession"("expiresAt");

-- CreateIndex
CREATE INDEX "GuestSession_browserFingerprint_idx" ON "GuestSession"("browserFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_trackingCode_key" ON "Meeting"("trackingCode");

-- CreateIndex
CREATE INDEX "Meeting_ownerId_idx" ON "Meeting"("ownerId");

-- CreateIndex
CREATE INDEX "Meeting_ownerType_idx" ON "Meeting"("ownerType");

-- CreateIndex
CREATE INDEX "Meeting_guestSessionId_idx" ON "Meeting"("guestSessionId");

-- CreateIndex
CREATE INDEX "Meeting_status_idx" ON "Meeting"("status");

-- CreateIndex
CREATE INDEX "Meeting_expiresAt_idx" ON "Meeting"("expiresAt");

-- CreateIndex
CREATE INDEX "Meeting_enterpriseId_idx" ON "Meeting"("enterpriseId");

-- CreateIndex
CREATE INDEX "Attendance_meetingId_idx" ON "Attendance"("meetingId");

-- CreateIndex
CREATE INDEX "Attendance_guestSessionId_idx" ON "Attendance"("guestSessionId");

-- CreateIndex
CREATE INDEX "Attendance_ownerType_idx" ON "Attendance"("ownerType");

-- CreateIndex
CREATE INDEX "Attendance_ownerId_idx" ON "Attendance"("ownerId");

-- CreateIndex
CREATE INDEX "Attendance_participantId_idx" ON "Attendance"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceToken_meetingId_key" ON "AttendanceToken"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceToken_token_key" ON "AttendanceToken"("token");

-- CreateIndex
CREATE INDEX "AttendanceToken_token_idx" ON "AttendanceToken"("token");

-- CreateIndex
CREATE INDEX "AttendanceToken_meetingId_idx" ON "AttendanceToken"("meetingId");

-- CreateIndex
CREATE INDEX "Recording_meetingId_idx" ON "Recording"("meetingId");

-- CreateIndex
CREATE INDEX "Recording_expiresAt_idx" ON "Recording"("expiresAt");

-- CreateIndex
CREATE INDEX "Recording_processingStatus_idx" ON "Recording"("processingStatus");

-- CreateIndex
CREATE INDEX "Transcript_meetingId_idx" ON "Transcript"("meetingId");

-- CreateIndex
CREATE INDEX "TranscriptSegment_meetingId_idx" ON "TranscriptSegment"("meetingId");

-- CreateIndex
CREATE INDEX "TranscriptSegment_meetingId_startTime_idx" ON "TranscriptSegment"("meetingId", "startTime");

-- CreateIndex
CREATE INDEX "MeetingSummary_meetingId_idx" ON "MeetingSummary"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingMinutes_meetingId_idx" ON "MeetingMinutes"("meetingId");

-- CreateIndex
CREATE INDEX "Task_meetingId_idx" ON "Task"("meetingId");

-- CreateIndex
CREATE INDEX "Task_ownerId_idx" ON "Task"("ownerId");

-- CreateIndex
CREATE INDEX "Task_ownerType_idx" ON "Task"("ownerType");

-- CreateIndex
CREATE INDEX "Task_guestSessionId_idx" ON "Task"("guestSessionId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_participantId_idx" ON "Task"("participantId");

-- CreateIndex
CREATE INDEX "Task_enterpriseId_idx" ON "Task"("enterpriseId");

-- CreateIndex
CREATE INDEX "Task_createdByUserId_idx" ON "Task"("createdByUserId");

-- CreateIndex
CREATE INDEX "Task_assignedToUserId_idx" ON "Task"("assignedToUserId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskSubmissionToken_token_key" ON "TaskSubmissionToken"("token");

-- CreateIndex
CREATE INDEX "TaskSubmissionToken_taskId_idx" ON "TaskSubmissionToken"("taskId");

-- CreateIndex
CREATE INDEX "TaskSubmissionToken_token_idx" ON "TaskSubmissionToken"("token");

-- CreateIndex
CREATE INDEX "TaskSubmissionToken_expiresAt_idx" ON "TaskSubmissionToken"("expiresAt");

-- CreateIndex
CREATE INDEX "TaskSubmission_taskId_idx" ON "TaskSubmission"("taskId");

-- CreateIndex
CREATE INDEX "TaskSubmissionFile_submissionId_idx" ON "TaskSubmissionFile"("submissionId");

-- CreateIndex
CREATE INDEX "AiJob_meetingId_idx" ON "AiJob"("meetingId");

-- CreateIndex
CREATE INDEX "AiJob_status_idx" ON "AiJob"("status");

-- CreateIndex
CREATE INDEX "AiJob_type_idx" ON "AiJob"("type");

-- CreateIndex
CREATE INDEX "AiJob_meetingId_type_status_idx" ON "AiJob"("meetingId", "type", "status");

-- CreateIndex
CREATE INDEX "TranscriptSnapshot_meetingId_idx" ON "TranscriptSnapshot"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingArtifact_meetingId_idx" ON "MeetingArtifact"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingArtifact_status_idx" ON "MeetingArtifact"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingArtifact_meetingId_type_key" ON "MeetingArtifact"("meetingId", "type");

-- AddForeignKey
ALTER TABLE "EnterpriseInvite" ADD CONSTRAINT "EnterpriseInvite_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseInvite" ADD CONSTRAINT "EnterpriseInvite_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseInvite" ADD CONSTRAINT "EnterpriseInvite_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseMembership" ADD CONSTRAINT "EnterpriseMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseMembership" ADD CONSTRAINT "EnterpriseMembership_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantSession" ADD CONSTRAINT "ParticipantSession_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantSession" ADD CONSTRAINT "ParticipantSession_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantSession" ADD CONSTRAINT "ParticipantSession_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "ParticipantInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantInvite" ADD CONSTRAINT "ParticipantInvite_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantInvite" ADD CONSTRAINT "ParticipantInvite_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "GuestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "GuestSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceToken" ADD CONSTRAINT "AttendanceToken_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptSegment" ADD CONSTRAINT "TranscriptSegment_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingSummary" ADD CONSTRAINT "MeetingSummary_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingMinutes" ADD CONSTRAINT "MeetingMinutes_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "GuestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSubmissionToken" ADD CONSTRAINT "TaskSubmissionToken_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSubmission" ADD CONSTRAINT "TaskSubmission_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSubmissionFile" ADD CONSTRAINT "TaskSubmissionFile_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "TaskSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiJob" ADD CONSTRAINT "AiJob_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiJob" ADD CONSTRAINT "AiJob_transcriptSnapshotId_fkey" FOREIGN KEY ("transcriptSnapshotId") REFERENCES "TranscriptSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingArtifact" ADD CONSTRAINT "MeetingArtifact_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
