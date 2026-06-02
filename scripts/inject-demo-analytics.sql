-- Delete existing demo records if they exist (for idempotency)
DELETE FROM "AnalyticsSnapshot" WHERE "postId" LIKE 'demo_post_%';
DELETE FROM "PostPlatform" WHERE "postId" LIKE 'demo_post_%';
DELETE FROM "Post" WHERE "id" LIKE 'demo_post_%';
DELETE FROM "FollowerSnapshot" WHERE "id" = 'demo_foll_1';

-- Create 5 external posts
INSERT INTO "Post" (id, "workspaceId", title, content, status, "isExternal", "publishedAt", "createdAt", "updatedAt") VALUES
('demo_post_1', 'cb00516d621a641b5ac5e72cf', 'Excited to share our new product launch', '{"text": "Excited to share our new product launch. This has been months in the work...", "media": []}', 'EXTERNAL', true, NOW() - INTERVAL '3 days', NOW(), NOW()),
('demo_post_2', 'cb00516d621a641b5ac5e72cf', 'Key lessons from 10 years in tech', '{"text": "Key lessons from 10 years in tech. Thread below.", "media": []}', 'EXTERNAL', true, NOW() - INTERVAL '7 days', NOW(), NOW()),
('demo_post_3', 'cb00516d621a641b5ac5e72cf', '5 tips for better productivity', '{"text": "5 tips for better productivity as a founder.", "media": []}', 'EXTERNAL', true, NOW() - INTERVAL '14 days', NOW(), NOW()),
('demo_post_4', 'cb00516d621a641b5ac5e72cf', 'Hiring for our team - apply now', '{"text": "We are hiring! Looking for talented people to join our team.", "media": []}', 'EXTERNAL', true, NOW() - INTERVAL '21 days', NOW(), NOW()),
('demo_post_5', 'cb00516d621a641b5ac5e72cf', 'Industry trends for 2026', '{"text": "My predictions for industry trends in 2026.", "media": []}', 'EXTERNAL', true, NOW() - INTERVAL '28 days', NOW(), NOW());

-- Create PostPlatform records
INSERT INTO "PostPlatform" (id, "postId", platform, content, status, "externalId", "createdAt") VALUES
('demo_pp_1', 'demo_post_1', 'linkedin', 'Excited to share our new product launch', 'PUBLISHED', '7001234567', NOW()),
('demo_pp_2', 'demo_post_2', 'linkedin', 'Key lessons from 10 years in tech', 'PUBLISHED', '7001234568', NOW()),
('demo_pp_3', 'demo_post_3', 'linkedin', '5 tips for better productivity', 'PUBLISHED', '7001234569', NOW()),
('demo_pp_4', 'demo_post_4', 'linkedin', 'Hiring for our team - apply now', 'PUBLISHED', '7001234570', NOW()),
('demo_pp_5', 'demo_post_5', 'linkedin', 'Industry trends for 2026', 'PUBLISHED', '7001234571', NOW());

-- Create AnalyticsSnapshot records with realistic metrics
INSERT INTO "AnalyticsSnapshot" (id, "postId", platform, likes, comments, shares, impressions, reach, clicks, "engagementRate", "snapshotAt") VALUES
('demo_snap_1', 'demo_post_1', 'linkedin', 142, 23, 15, 5420, 5420, 89, 0.033, NOW()),
('demo_snap_2', 'demo_post_2', 'linkedin', 89, 34, 12, 3210, 3210, 45, 0.042, NOW()),
('demo_snap_3', 'demo_post_3', 'linkedin', 234, 45, 28, 8750, 8750, 120, 0.035, NOW()),
('demo_snap_4', 'demo_post_4', 'linkedin', 67, 12, 8, 2100, 2100, 34, 0.041, NOW()),
('demo_snap_5', 'demo_post_5', 'linkedin', 178, 56, 31, 6890, 6890, 98, 0.038, NOW());

-- Create FollowerSnapshot
INSERT INTO "FollowerSnapshot" (id, "workspaceId", platform, followers, following, "snapshotAt") VALUES
('demo_foll_1', 'cb00516d621a641b5ac5e72cf', 'linkedin', 1247, 523, NOW());
