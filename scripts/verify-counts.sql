SELECT 'Posts: ' || COUNT(*) as result FROM "Post" WHERE "id" LIKE 'demo_post_%'
UNION ALL
SELECT 'PostPlatforms: ' || COUNT(*) FROM "PostPlatform" WHERE "postId" LIKE 'demo_post_%'
UNION ALL
SELECT 'AnalyticsSnapshots: ' || COUNT(*) FROM "AnalyticsSnapshot" WHERE "postId" LIKE 'demo_post_%'
UNION ALL
SELECT 'FollowerSnapshots: ' || COUNT(*) FROM "FollowerSnapshot" WHERE "workspaceId" = 'cb00516d621a641b5ac5e72cf' AND id = 'demo_foll_1';
