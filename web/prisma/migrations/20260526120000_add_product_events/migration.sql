-- CreateTable
CREATE TABLE "ProductEvent" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "props" JSONB,
    "sessionId" TEXT,
    "source" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductEvent_createdAt_idx" ON "ProductEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ProductEvent_event_createdAt_idx" ON "ProductEvent"("event", "createdAt");

-- CreateIndex
CREATE INDEX "ProductEvent_sessionId_createdAt_idx" ON "ProductEvent"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductEvent_source_createdAt_idx" ON "ProductEvent"("source", "createdAt");
