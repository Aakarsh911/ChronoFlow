-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('MEETING', 'TASK', 'FOCUS_TIME', 'PERSONAL');

-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('GOOGLE', 'MICROSOFT', 'CHRONOFLOW');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SYNCED', 'PENDING', 'CONFLICT', 'ERROR');

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "timeZone" TEXT DEFAULT 'UTC',
    "attendees" JSONB,
    "organizerEmail" TEXT,
    "meetingUrl" TEXT,
    "htmlLink" TEXT,
    "eventType" "EventType" NOT NULL DEFAULT 'PERSONAL',
    "isManaged" BOOLEAN NOT NULL DEFAULT false,
    "source" "EventSource" NOT NULL,
    "sourceId" TEXT,
    "sourceCalendarId" TEXT,
    "sourceData" JSONB,
    "taskId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "modifiedLocally" BOOLEAN NOT NULL DEFAULT false,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'SYNCED',
    "syncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarSync" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "EventSource" NOT NULL,
    "calendarId" TEXT NOT NULL,
    "calendarName" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSuccessfulSync" TIMESTAMP(3),
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "syncFrequency" INTEGER NOT NULL DEFAULT 300,
    "lastSyncError" TEXT,
    "consecutiveErrors" INTEGER NOT NULL DEFAULT 0,
    "syncToken" TEXT,
    "deltaLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarEvent_userId_idx" ON "CalendarEvent"("userId");

-- CreateIndex
CREATE INDEX "CalendarEvent_userId_startTime_idx" ON "CalendarEvent"("userId", "startTime");

-- CreateIndex
CREATE INDEX "CalendarEvent_userId_eventType_isManaged_idx" ON "CalendarEvent"("userId", "eventType", "isManaged");

-- CreateIndex
CREATE INDEX "CalendarEvent_source_sourceId_idx" ON "CalendarEvent"("source", "sourceId");

-- CreateIndex
CREATE INDEX "CalendarEvent_syncStatus_modifiedLocally_idx" ON "CalendarEvent"("syncStatus", "modifiedLocally");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_userId_source_sourceId_key" ON "CalendarEvent"("userId", "source", "sourceId");

-- CreateIndex
CREATE INDEX "CalendarSync_userId_source_idx" ON "CalendarSync"("userId", "source");

-- CreateIndex
CREATE INDEX "CalendarSync_syncEnabled_lastSyncedAt_idx" ON "CalendarSync"("syncEnabled", "lastSyncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSync_userId_source_calendarId_key" ON "CalendarSync"("userId", "source", "calendarId");

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSync" ADD CONSTRAINT "CalendarSync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
