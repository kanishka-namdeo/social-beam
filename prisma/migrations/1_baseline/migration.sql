-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('REDDIT_SCRAPING', 'BRAND_LEARNING', 'SCRAPER_HEALER', 'PUBLISH_QUEUE', 'ANALYTICS_SYNC', 'BRAND_ANALYSIS', 'LINKEDIN_IMPORT', 'MCP_TOOL_CALL');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'AI_STARTER', 'AI_PRO');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "EngagementStatus" AS ENUM ('UNREAD', 'READ', 'REPLIED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "EngagementType" AS ENUM ('COMMENT', 'MENTION', 'DM');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'FREE_USER', 'PREMIUM_USER');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('info', 'success', 'warning', 'error');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('post_publish', 'engagement', 'system', 'billing', 'ai_insight', 'connection', 'brand', 'custom');

-- CreateEnum
CREATE TYPE "DigestFrequency" AS ENUM ('NEVER', 'DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "ProcessStatus" AS ENUM ('QUEUED', 'STARTING', 'RUNNING', 'PAUSED', 'STOPPING', 'COMPLETED', 'FAILED', 'CANCELLED', 'ORPHANED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CampaignPhaseType" AS ENUM ('TEASER', 'LAUNCH', 'SOCIAL_PROOF', 'LAST_CALL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "QueueSourceType" AS ENUM ('MANUAL', 'RECYCLE', 'TEMPLATE');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('ACTIVE', 'PAUSED', 'EXHAUSTED');

-- CreateEnum
CREATE TYPE "IdeaSource" AS ENUM ('MANUAL', 'AI_GENERATED', 'RSS', 'TRENDING');

-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('NEW', 'PLACED', 'CONVERTED', 'DISMISSED');

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "profileVisits" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "videoViews" INTEGER NOT NULL DEFAULT 0,
    "websiteClicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandContext" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "businessName" TEXT,
    "tagline" TEXT,
    "websiteUrl" TEXT,
    "industry" TEXT,
    "productDesc" TEXT,
    "tonePreset" TEXT,
    "voiceDescription" TEXT,
    "bannedWords" TEXT[],
    "voiceExamples" JSONB,
    "audienceType" TEXT,
    "demographics" JSONB,
    "interests" TEXT[],
    "painPoints" TEXT[],
    "competitors" TEXT[],
    "goals" TEXT[],
    "trainingStatus" TEXT NOT NULL DEFAULT 'untrained',
    "lastTrainedAt" TIMESTAMP(3),
    "defaultSignatureText" TEXT,
    "defaultSignatureUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandContextVersion" (
    "id" TEXT NOT NULL,
    "brandContextId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changeReason" TEXT,
    "platformSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandContextVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandFieldState" (
    "id" TEXT NOT NULL,
    "brandContextId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "currentValue" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "stability" INTEGER NOT NULL DEFAULT 0,
    "signalCount" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandFieldState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandLearningSignal" (
    "id" TEXT NOT NULL,
    "brandContextId" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "sourcePostId" TEXT,
    "fieldName" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "magnitude" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,

    CONSTRAINT "BrandLearningSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandDraft" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "checkpointStep" TEXT NOT NULL,
    "stateSnapshot" JSONB NOT NULL,
    "brandContextDraft" JSONB,
    "platformContextsDraft" JSONB,
    "samplePosts" JSONB,
    "crawledContent" JSONB,
    "currentStep" TEXT NOT NULL,
    "inputUrl" TEXT,
    "inputDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandVoice" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "tonePreset" TEXT,
    "description" TEXT,
    "examples" JSONB NOT NULL DEFAULT '[]',
    "perPlatform" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandVoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectedAccount" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platformUserId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiry" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'connected',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avatarUrl" TEXT,
    "followerCount" INTEGER,
    "lastRefreshAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "platformUsername" TEXT,
    "sourcePlatform" TEXT,
    "cookieExpiry" TIMESTAMP(3),
    "sessionCookie" TEXT,

    CONSTRAINT "ConnectedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardPreference" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "layout" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementItem" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "type" "EngagementType" NOT NULL,
    "platformItemId" TEXT NOT NULL,
    "platformUrl" TEXT,
    "authorName" TEXT,
    "authorAvatar" TEXT,
    "authorProfileUrl" TEXT,
    "authorHandle" TEXT,
    "content" TEXT NOT NULL,
    "parentContent" TEXT,
    "parentId" TEXT,
    "inReplyToId" TEXT,
    "status" "EngagementStatus" NOT NULL DEFAULT 'UNREAD',
    "sentiment" TEXT,
    "aiDraft" TEXT,
    "aiDraftGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repliedAt" TIMESTAMP(3),

    CONSTRAINT "EngagementItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "profileUrl" TEXT,
    "handle" TEXT,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "headline" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastEngagedAt" TIMESTAMP(3),

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowerSnapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "following" INTEGER NOT NULL DEFAULT 0,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowerSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "variants" JSONB DEFAULT '[]',
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStep" TEXT NOT NULL DEFAULT 'greeting',
    "stepData" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformContext" (
    "id" TEXT NOT NULL,
    "brandContextId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platformTone" TEXT,
    "contentMix" JSONB,
    "postingCadence" TEXT,
    "hashtagStrategy" JSONB,
    "visualStyle" TEXT,
    "engagementStyle" TEXT,
    "platformRules" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT,
    "content" JSONB NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "confidence" "ConfidenceLevel",
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostPlatform" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrls" JSONB DEFAULT '[]',
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "externalId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postUrl" TEXT,
    "analyticsUrl" TEXT,

    CONSTRAINT "PostPlatform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedditSubredditConfig" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "subreddit" TEXT NOT NULL,
    "sortOrder" TEXT NOT NULL DEFAULT 'hot',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "relevanceScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedditSubredditConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedditTrendingPost" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "subreddit" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "relevanceScore" DOUBLE PRECISION,
    "relevanceReason" TEXT,
    "isActionable" BOOLEAN NOT NULL DEFAULT false,
    "topicTags" TEXT[],
    "suggestedAction" TEXT,
    "actedOnAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "postId" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "riskReason" TEXT,
    "sentiment" TEXT NOT NULL DEFAULT 'neutral',
    "brandReasonTags" TEXT[],
    "engagementDepthScore" DOUBLE PRECISION,
    "intentScore" INTEGER,
    "intentType" TEXT,
    "intentSignals" JSONB,
    "velocityScore" DOUBLE PRECISION,
    "trendPhase" TEXT,
    "previousUpvotes" INTEGER NOT NULL DEFAULT 0,
    "previousComments" INTEGER NOT NULL DEFAULT 0,
    "lastVelocityCheck" TIMESTAMP(3),

    CONSTRAINT "RedditTrendingPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedditComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "redditId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "depth" INTEGER NOT NULL,
    "parentId" TEXT,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "sentiment" TEXT,
    "hasBuyingSignal" BOOLEAN NOT NULL DEFAULT false,
    "signalType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedditComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedditAlert" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keywords" TEXT[],
    "subreddits" TEXT[],
    "minScore" INTEGER NOT NULL DEFAULT 50,
    "minIntent" INTEGER,
    "notifyOn" TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastTriggered" TIMESTAMP(3),

    CONSTRAINT "RedditAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedReply" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "platform" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'FREE_USER',
    "emailVerified" TIMESTAMP(3),
    "emailVerificationToken" TEXT,
    "emailVerificationExpiresAt" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpiresAt" TIMESTAMP(3),
    "lastRoleChangeAt" TIMESTAMP(3),
    "scheduledForDeletionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserOAuthApp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserOAuthApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "bio" JSONB,
    "tone" TEXT,
    "postTypes" JSONB,
    "imageAnalysis" JSONB,
    "audience" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'My Workspace',
    "autonomyLevel" TEXT NOT NULL DEFAULT 'suggestions',
    "publicHandle" TEXT,
    "signatureEnabled" BOOLEAN NOT NULL DEFAULT true,
    "performanceMemory" JSONB,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostSignature" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT,
    "text" TEXT NOT NULL,
    "url" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkpoint_blobs" (
    "thread_id" TEXT NOT NULL,
    "checkpoint_ns" TEXT NOT NULL DEFAULT '',
    "channel" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "blob" BYTEA,

    CONSTRAINT "checkpoint_blobs_pkey" PRIMARY KEY ("thread_id","checkpoint_ns","channel","version")
);

-- CreateTable
CREATE TABLE "checkpoint_migrations" (
    "v" INTEGER NOT NULL,

    CONSTRAINT "checkpoint_migrations_pkey" PRIMARY KEY ("v")
);

-- CreateTable
CREATE TABLE "checkpoint_writes" (
    "thread_id" TEXT NOT NULL,
    "checkpoint_ns" TEXT NOT NULL DEFAULT '',
    "checkpoint_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "idx" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "type" TEXT,
    "blob" BYTEA NOT NULL,

    CONSTRAINT "checkpoint_writes_pkey" PRIMARY KEY ("thread_id","checkpoint_ns","checkpoint_id","task_id","idx")
);

-- CreateTable
CREATE TABLE "checkpoints" (
    "thread_id" TEXT NOT NULL,
    "checkpoint_ns" TEXT NOT NULL DEFAULT '',
    "checkpoint_id" TEXT NOT NULL,
    "parent_checkpoint_id" TEXT,
    "type" TEXT,
    "checkpoint" JSONB NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "checkpoints_pkey" PRIMARY KEY ("thread_id","checkpoint_ns","checkpoint_id")
);

-- CreateTable
CREATE TABLE "McpAuthorizationCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'FREE_USER',
    "scopes" TEXT NOT NULL,
    "codeChallenge" TEXT NOT NULL,
    "codeChallengeMethod" TEXT NOT NULL DEFAULT 'S256',
    "redirectUri" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpAuthorizationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpRevokedToken" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpRevokedToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "status" "ActivityStatus" NOT NULL,
    "details" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "type" "NotificationType" NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "actionUrl" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "categories" JSONB NOT NULL DEFAULT '{"post_publish": {"in_app": true, "email": true, "push": false}, "engagement": {"in_app": true, "email": false, "push": false}, "system": {"in_app": true, "email": true, "push": false}, "billing": {"in_app": true, "email": true, "push": true}, "ai_insight": {"in_app": true, "email": false, "push": false}, "connection": {"in_app": true, "email": false, "push": false}, "brand": {"in_app": true, "email": false, "push": false}}',
    "digestFrequency" "DigestFrequency" NOT NULL DEFAULT 'WEEKLY',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScraperProcess" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "status" "ProcessStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentStep" TEXT,
    "postsFound" INTEGER NOT NULL DEFAULT 0,
    "postsProcessed" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScraperProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "goal" TEXT,
    "audience" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "duration" TEXT,
    "metadata" JSONB,
    "requireApproval" BOOLEAN NOT NULL DEFAULT false,
    "targetImpressions" INTEGER,
    "targetEngagementRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignPhase" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phase" "CampaignPhaseType" NOT NULL,
    "order" INTEGER NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3),

    CONSTRAINT "CampaignPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignPost" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "phaseId" TEXT,
    "postId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "notes" TEXT,
    "approvalStatus" TEXT DEFAULT 'approved',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "variantIndex" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" DOUBLE PRECISION,
    "qualityBreakdown" JSONB,

    CONSTRAINT "CampaignPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignTemplate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "goal" TEXT,
    "audience" TEXT,
    "duration" TEXT,
    "phases" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignActivity" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedditScrapeLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "subredditsScraped" INTEGER NOT NULL DEFAULT 0,
    "postsFound" INTEGER NOT NULL DEFAULT 0,
    "postsAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "status" TEXT NOT NULL DEFAULT 'running',

    CONSTRAINT "RedditScrapeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedditScrapeJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentSub" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "result" JSONB,
    "error" TEXT,

    CONSTRAINT "RedditScrapeJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedditTrendCluster" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "keywords" TEXT[],
    "postIds" TEXT[],
    "subreddits" TEXT[],
    "avgRelevance" DOUBLE PRECISION NOT NULL,
    "totalUpvotes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedditTrendCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentQueue" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "postId" TEXT,
    "sourceType" "QueueSourceType" NOT NULL DEFAULT 'MANUAL',
    "recycleInterval" INTEGER,
    "recycleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastRecycledAt" TIMESTAMP(3),
    "recycleCount" INTEGER NOT NULL DEFAULT 0,
    "maxRecycles" INTEGER,
    "category" TEXT,
    "platforms" JSONB NOT NULL DEFAULT '[]',
    "status" "QueueStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Idea" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "category" TEXT,
    "source" "IdeaSource" NOT NULL DEFAULT 'MANUAL',
    "trendSource" JSONB,
    "targetDate" TIMESTAMP(3),
    "convertedToPostId" TEXT,
    "status" "IdeaStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarNote" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "blockScheduling" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostTemplate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "platforms" JSONB NOT NULL DEFAULT '[]',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tosAcceptedAt" TIMESTAMP(3),
    "tosVersion" TEXT,
    "privacyPolicyAcceptedAt" TIMESTAMP(3),
    "privacyPolicyVersion" TEXT,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "analyticsOptIn" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeadLetterQueue" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "error" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "DeadLetterQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_postId_idx" ON "AnalyticsSnapshot"("postId");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_postId_snapshotAt_idx" ON "AnalyticsSnapshot"("postId", "snapshotAt");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_snapshotAt_idx" ON "AnalyticsSnapshot"("snapshotAt");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_engagementRate_idx" ON "AnalyticsSnapshot"("engagementRate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "BrandContext_workspaceId_key" ON "BrandContext"("workspaceId");

-- CreateIndex
CREATE INDEX "BrandContext_workspaceId_idx" ON "BrandContext"("workspaceId");

-- CreateIndex
CREATE INDEX "BrandContextVersion_brandContextId_idx" ON "BrandContextVersion"("brandContextId");

-- CreateIndex
CREATE INDEX "BrandContextVersion_createdAt_idx" ON "BrandContextVersion"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BrandFieldState_brandContextId_fieldName_key" ON "BrandFieldState"("brandContextId", "fieldName");

-- CreateIndex
CREATE INDEX "BrandLearningSignal_brandContextId_fieldName_idx" ON "BrandLearningSignal"("brandContextId", "fieldName");

-- CreateIndex
CREATE INDEX "BrandLearningSignal_brandContextId_signalType_idx" ON "BrandLearningSignal"("brandContextId", "signalType");

-- CreateIndex
CREATE INDEX "BrandLearningSignal_createdAt_idx" ON "BrandLearningSignal"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BrandDraft_threadId_key" ON "BrandDraft"("threadId");

-- CreateIndex
CREATE INDEX "BrandDraft_workspaceId_idx" ON "BrandDraft"("workspaceId");

-- CreateIndex
CREATE INDEX "BrandDraft_expiresAt_idx" ON "BrandDraft"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "BrandVoice_workspaceId_key" ON "BrandVoice"("workspaceId");

-- CreateIndex
CREATE INDEX "ConnectedAccount_workspaceId_status_idx" ON "ConnectedAccount"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_workspaceId_platform_key" ON "ConnectedAccount"("workspaceId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardPreference_workspaceId_key" ON "DashboardPreference"("workspaceId");

-- CreateIndex
CREATE INDEX "DashboardPreference_workspaceId_idx" ON "DashboardPreference"("workspaceId");

-- CreateIndex
CREATE INDEX "EngagementItem_workspaceId_createdAt_idx" ON "EngagementItem"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "EngagementItem_workspaceId_platform_idx" ON "EngagementItem"("workspaceId", "platform");

-- CreateIndex
CREATE INDEX "EngagementItem_workspaceId_sentiment_idx" ON "EngagementItem"("workspaceId", "sentiment");

-- CreateIndex
CREATE INDEX "EngagementItem_workspaceId_status_idx" ON "EngagementItem"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "EngagementItem_workspaceId_type_idx" ON "EngagementItem"("workspaceId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "EngagementItem_workspaceId_platformItemId_key" ON "EngagementItem"("workspaceId", "platformItemId");

-- CreateIndex
CREATE INDEX "Contact_workspaceId_platform_idx" ON "Contact"("workspaceId", "platform");

-- CreateIndex
CREATE INDEX "Contact_workspaceId_name_idx" ON "Contact"("workspaceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_workspaceId_platform_profileUrl_key" ON "Contact"("workspaceId", "platform", "profileUrl");

-- CreateIndex
CREATE INDEX "FollowerSnapshot_workspaceId_platform_snapshotAt_idx" ON "FollowerSnapshot"("workspaceId", "platform", "snapshotAt");

-- CreateIndex
CREATE INDEX "FollowerSnapshot_workspaceId_snapshotAt_idx" ON "FollowerSnapshot"("workspaceId", "snapshotAt");

-- CreateIndex
CREATE INDEX "MediaAsset_workspaceId_createdAt_idx" ON "MediaAsset"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "MediaAsset_workspaceId_idx" ON "MediaAsset"("workspaceId");

-- CreateIndex
CREATE INDEX "MediaAsset_workspaceId_status_idx" ON "MediaAsset"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "MediaAsset_workspaceId_publicUrl_idx" ON "MediaAsset"("workspaceId", "publicUrl");

-- CreateIndex
CREATE INDEX "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingSession_userId_key" ON "OnboardingSession"("userId");

-- CreateIndex
CREATE INDEX "PlatformContext_brandContextId_idx" ON "PlatformContext"("brandContextId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformContext_brandContextId_platform_key" ON "PlatformContext"("brandContextId", "platform");

-- CreateIndex
CREATE INDEX "Post_workspaceId_idx" ON "Post"("workspaceId");

-- CreateIndex
CREATE INDEX "Post_workspaceId_status_idx" ON "Post"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Post_workspaceId_status_scheduledAt_idx" ON "Post"("workspaceId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Post_workspaceId_status_publishedAt_idx" ON "Post"("workspaceId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "Post_workspaceId_createdAt_idx" ON "Post"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Post_workspaceId_scheduledAt_idx" ON "Post"("workspaceId", "scheduledAt");

-- CreateIndex
CREATE INDEX "PostPlatform_postId_idx" ON "PostPlatform"("postId");

-- CreateIndex
CREATE INDEX "PostPlatform_platform_idx" ON "PostPlatform"("platform");

-- CreateIndex
CREATE INDEX "PostPlatform_platform_status_idx" ON "PostPlatform"("platform", "status");

-- CreateIndex
CREATE INDEX "RedditSubredditConfig_workspaceId_idx" ON "RedditSubredditConfig"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "RedditSubredditConfig_workspaceId_subreddit_key" ON "RedditSubredditConfig"("workspaceId", "subreddit");

-- CreateIndex
CREATE INDEX "RedditTrendingPost_workspaceId_dismissedAt_idx" ON "RedditTrendingPost"("workspaceId", "dismissedAt");

-- CreateIndex
CREATE INDEX "RedditTrendingPost_workspaceId_postId_idx" ON "RedditTrendingPost"("workspaceId", "postId");

-- CreateIndex
CREATE INDEX "RedditTrendingPost_workspaceId_relevanceScore_idx" ON "RedditTrendingPost"("workspaceId", "relevanceScore");

-- CreateIndex
CREATE INDEX "RedditTrendingPost_workspaceId_scrapedAt_idx" ON "RedditTrendingPost"("workspaceId", "scrapedAt");

-- CreateIndex
CREATE INDEX "RedditTrendingPost_workspaceId_subreddit_idx" ON "RedditTrendingPost"("workspaceId", "subreddit");

-- CreateIndex
CREATE INDEX "RedditTrendingPost_workspaceId_upvotes_idx" ON "RedditTrendingPost"("workspaceId", "upvotes" DESC);

-- CreateIndex
CREATE INDEX "RedditTrendingPost_workspaceId_intentScore_idx" ON "RedditTrendingPost"("workspaceId", "intentScore");

-- CreateIndex
CREATE INDEX "RedditComment_postId_idx" ON "RedditComment"("postId");

-- CreateIndex
CREATE INDEX "RedditComment_hasBuyingSignal_idx" ON "RedditComment"("hasBuyingSignal");

-- CreateIndex
CREATE UNIQUE INDEX "RedditComment_postId_redditId_key" ON "RedditComment"("postId", "redditId");

-- CreateIndex
CREATE INDEX "RedditAlert_workspaceId_idx" ON "RedditAlert"("workspaceId");

-- CreateIndex
CREATE INDEX "RedditAlert_enabled_idx" ON "RedditAlert"("enabled");

-- CreateIndex
CREATE INDEX "SavedReply_workspaceId_idx" ON "SavedReply"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_emailVerificationToken_key" ON "User"("emailVerificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_passwordResetToken_key" ON "User"("passwordResetToken");

-- CreateIndex
CREATE UNIQUE INDEX "UserOAuthApp_userId_platform_key" ON "UserOAuthApp"("userId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_workspaceId_key" ON "UserProfile"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_publicHandle_key" ON "Workspace"("publicHandle");

-- CreateIndex
CREATE INDEX "PostSignature_workspaceId_idx" ON "PostSignature"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "PostSignature_workspaceId_isDefault_key" ON "PostSignature"("workspaceId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "McpAuthorizationCode_code_key" ON "McpAuthorizationCode"("code");

-- CreateIndex
CREATE INDEX "McpAuthorizationCode_expiresAt_idx" ON "McpAuthorizationCode"("expiresAt");

-- CreateIndex
CREATE INDEX "McpAuthorizationCode_userId_idx" ON "McpAuthorizationCode"("userId");

-- CreateIndex
CREATE INDEX "McpAuthorizationCode_workspaceId_idx" ON "McpAuthorizationCode"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "McpRevokedToken_jti_key" ON "McpRevokedToken"("jti");

-- CreateIndex
CREATE INDEX "McpRevokedToken_expiresAt_idx" ON "McpRevokedToken"("expiresAt");

-- CreateIndex
CREATE INDEX "McpRevokedToken_userId_idx" ON "McpRevokedToken"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_workspaceId_createdAt_idx" ON "ActivityLog"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ActivityLog_workspaceId_status_idx" ON "ActivityLog"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "ActivityLog_workspaceId_type_idx" ON "ActivityLog"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_workspaceId_idx" ON "Notification"("workspaceId");

-- CreateIndex
CREATE INDEX "Notification_category_idx" ON "Notification"("category");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "ScraperProcess_workspaceId_status_idx" ON "ScraperProcess"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "ScraperProcess_workspaceId_type_status_idx" ON "ScraperProcess"("workspaceId", "type", "status");

-- CreateIndex
CREATE INDEX "ScraperProcess_status_idx" ON "ScraperProcess"("status");

-- CreateIndex
CREATE INDEX "Campaign_workspaceId_status_idx" ON "Campaign"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Campaign_workspaceId_createdAt_idx" ON "Campaign"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CampaignPhase_campaignId_order_idx" ON "CampaignPhase"("campaignId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignPost_postId_key" ON "CampaignPost"("postId");

-- CreateIndex
CREATE INDEX "CampaignPost_campaignId_order_idx" ON "CampaignPost"("campaignId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignPost_campaignId_postId_key" ON "CampaignPost"("campaignId", "postId");

-- CreateIndex
CREATE INDEX "CampaignTemplate_workspaceId_idx" ON "CampaignTemplate"("workspaceId");

-- CreateIndex
CREATE INDEX "CampaignActivity_campaignId_createdAt_idx" ON "CampaignActivity"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "CampaignActivity_userId_idx" ON "CampaignActivity"("userId");

-- CreateIndex
CREATE INDEX "RedditScrapeLog_workspaceId_startedAt_idx" ON "RedditScrapeLog"("workspaceId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "RedditScrapeLog_status_idx" ON "RedditScrapeLog"("status");

-- CreateIndex
CREATE INDEX "RedditScrapeJob_workspaceId_startedAt_idx" ON "RedditScrapeJob"("workspaceId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "RedditScrapeJob_status_idx" ON "RedditScrapeJob"("status");

-- CreateIndex
CREATE INDEX "RedditTrendCluster_workspaceId_createdAt_idx" ON "RedditTrendCluster"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "RedditTrendCluster_workspaceId_idx" ON "RedditTrendCluster"("workspaceId");

-- CreateIndex
CREATE INDEX "ContentQueue_workspaceId_idx" ON "ContentQueue"("workspaceId");

-- CreateIndex
CREATE INDEX "ContentQueue_workspaceId_status_idx" ON "ContentQueue"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "ContentQueue_workspaceId_recycleEnabled_idx" ON "ContentQueue"("workspaceId", "recycleEnabled");

-- CreateIndex
CREATE INDEX "ContentQueue_postId_idx" ON "ContentQueue"("postId");

-- CreateIndex
CREATE INDEX "Idea_workspaceId_idx" ON "Idea"("workspaceId");

-- CreateIndex
CREATE INDEX "Idea_workspaceId_status_idx" ON "Idea"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Idea_workspaceId_targetDate_idx" ON "Idea"("workspaceId", "targetDate");

-- CreateIndex
CREATE INDEX "Idea_convertedToPostId_idx" ON "Idea"("convertedToPostId");

-- CreateIndex
CREATE INDEX "CalendarNote_workspaceId_idx" ON "CalendarNote"("workspaceId");

-- CreateIndex
CREATE INDEX "CalendarNote_workspaceId_date_idx" ON "CalendarNote"("workspaceId", "date");

-- CreateIndex
CREATE INDEX "PostTemplate_workspaceId_idx" ON "PostTemplate"("workspaceId");

-- CreateIndex
CREATE INDEX "PostTemplate_workspaceId_category_idx" ON "PostTemplate"("workspaceId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "ConsentLog_userId_idx" ON "ConsentLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentLog_userId_key" ON "ConsentLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_key_key" ON "IdempotencyKey"("key");

-- CreateIndex
CREATE INDEX "IdempotencyKey_key_userId_idx" ON "IdempotencyKey"("key", "userId");

-- CreateIndex
CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

-- CreateIndex
CREATE INDEX "DeadLetterQueue_entityType_entityId_idx" ON "DeadLetterQueue"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "DeadLetterQueue_nextRetryAt_idx" ON "DeadLetterQueue"("nextRetryAt");

-- CreateIndex
CREATE INDEX "DeadLetterQueue_createdAt_idx" ON "DeadLetterQueue"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandContext" ADD CONSTRAINT "BrandContext_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandContextVersion" ADD CONSTRAINT "BrandContextVersion_brandContextId_fkey" FOREIGN KEY ("brandContextId") REFERENCES "BrandContext"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandFieldState" ADD CONSTRAINT "BrandFieldState_brandContextId_fkey" FOREIGN KEY ("brandContextId") REFERENCES "BrandContext"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandLearningSignal" ADD CONSTRAINT "BrandLearningSignal_brandContextId_fkey" FOREIGN KEY ("brandContextId") REFERENCES "BrandContext"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandDraft" ADD CONSTRAINT "BrandDraft_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandVoice" ADD CONSTRAINT "BrandVoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectedAccount" ADD CONSTRAINT "ConnectedAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardPreference" ADD CONSTRAINT "DashboardPreference_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementItem" ADD CONSTRAINT "EngagementItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowerSnapshot" ADD CONSTRAINT "FollowerSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingSession" ADD CONSTRAINT "OnboardingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformContext" ADD CONSTRAINT "PlatformContext_brandContextId_fkey" FOREIGN KEY ("brandContextId") REFERENCES "BrandContext"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostPlatform" ADD CONSTRAINT "PostPlatform_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedditSubredditConfig" ADD CONSTRAINT "RedditSubredditConfig_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedditTrendingPost" ADD CONSTRAINT "RedditTrendingPost_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedditComment" ADD CONSTRAINT "RedditComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "RedditTrendingPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedditAlert" ADD CONSTRAINT "RedditAlert_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedReply" ADD CONSTRAINT "SavedReply_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOAuthApp" ADD CONSTRAINT "UserOAuthApp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSignature" ADD CONSTRAINT "PostSignature_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpAuthorizationCode" ADD CONSTRAINT "McpAuthorizationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpRevokedToken" ADD CONSTRAINT "McpRevokedToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScraperProcess" ADD CONSTRAINT "ScraperProcess_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPhase" ADD CONSTRAINT "CampaignPhase_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPost" ADD CONSTRAINT "CampaignPost_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPost" ADD CONSTRAINT "CampaignPost_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "CampaignPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPost" ADD CONSTRAINT "CampaignPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignTemplate" ADD CONSTRAINT "CampaignTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignActivity" ADD CONSTRAINT "CampaignActivity_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedditScrapeLog" ADD CONSTRAINT "RedditScrapeLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedditScrapeJob" ADD CONSTRAINT "RedditScrapeJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedditTrendCluster" ADD CONSTRAINT "RedditTrendCluster_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentQueue" ADD CONSTRAINT "ContentQueue_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarNote" ADD CONSTRAINT "CalendarNote_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTemplate" ADD CONSTRAINT "PostTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentLog" ADD CONSTRAINT "ConsentLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
