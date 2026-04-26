-- DEV-001: schema base de trilhas, videos e progresso.
-- Equivalente ao que `prisma migrate dev --name init` gera a partir de schema.prisma.

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'CURATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "RoadmapSource" AS ENUM ('OFFICIAL', 'USER');

-- CreateEnum
CREATE TYPE "RoadmapVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');

-- CreateEnum
CREATE TYPE "RoadmapItemStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmaps" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source" "RoadmapSource" NOT NULL,
    "visibility" "RoadmapVisibility" NOT NULL DEFAULT 'PUBLIC',
    "ownerId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_topics" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmap_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_items" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "topicId" TEXT,
    "youtubeVideoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "channel" TEXT,
    "thumbnailUrl" TEXT,
    "durationSeconds" INTEGER,
    "order" INTEGER NOT NULL,
    "status" "RoadmapItemStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmap_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_video_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roadmapItemId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "activityDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_video_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roadmap_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "completedItems" INTEGER NOT NULL DEFAULT 0,
    "percentComplete" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "user_roadmap_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roadmaps_slug_key" ON "roadmaps"("slug");

-- CreateIndex
CREATE INDEX "roadmaps_source_visibility_idx" ON "roadmaps"("source", "visibility");

-- CreateIndex
CREATE INDEX "roadmaps_ownerId_idx" ON "roadmaps"("ownerId");

-- CreateIndex
CREATE INDEX "roadmap_topics_roadmapId_idx" ON "roadmap_topics"("roadmapId");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_topics_roadmapId_order_key" ON "roadmap_topics"("roadmapId", "order");

-- CreateIndex
CREATE INDEX "roadmap_items_roadmapId_idx" ON "roadmap_items"("roadmapId");

-- CreateIndex
CREATE INDEX "roadmap_items_topicId_idx" ON "roadmap_items"("topicId");

-- CreateIndex
CREATE INDEX "roadmap_items_youtubeVideoId_idx" ON "roadmap_items"("youtubeVideoId");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_items_roadmapId_order_key" ON "roadmap_items"("roadmapId", "order");

-- CreateIndex
CREATE INDEX "user_video_progress_userId_idx" ON "user_video_progress"("userId");

-- CreateIndex
CREATE INDEX "user_video_progress_roadmapItemId_idx" ON "user_video_progress"("roadmapItemId");

-- CreateIndex
CREATE INDEX "user_video_progress_activityDate_idx" ON "user_video_progress"("activityDate");

-- CreateIndex
CREATE UNIQUE INDEX "user_video_progress_userId_roadmapItemId_key" ON "user_video_progress"("userId", "roadmapItemId");

-- CreateIndex
CREATE INDEX "user_roadmap_progress_userId_idx" ON "user_roadmap_progress"("userId");

-- CreateIndex
CREATE INDEX "user_roadmap_progress_roadmapId_idx" ON "user_roadmap_progress"("roadmapId");

-- CreateIndex
CREATE UNIQUE INDEX "user_roadmap_progress_userId_roadmapId_key" ON "user_roadmap_progress"("userId", "roadmapId");

-- AddForeignKey
ALTER TABLE "roadmaps" ADD CONSTRAINT "roadmaps_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_topics" ADD CONSTRAINT "roadmap_topics_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_items" ADD CONSTRAINT "roadmap_items_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_items" ADD CONSTRAINT "roadmap_items_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "roadmap_topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_video_progress" ADD CONSTRAINT "user_video_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_video_progress" ADD CONSTRAINT "user_video_progress_roadmapItemId_fkey" FOREIGN KEY ("roadmapItemId") REFERENCES "roadmap_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roadmap_progress" ADD CONSTRAINT "user_roadmap_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roadmap_progress" ADD CONSTRAINT "user_roadmap_progress_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
