SELECT 'AnalyticsSnapshot count' as table_name, COUNT(*) as record_count FROM "AnalyticsSnapshot" WHERE "postId" LIKE 'demo_post_%'
UNION ALL
SELECT 'FollowerSnapshot count', COUNT(*) FROM "FollowerSnapshot" WHERE "workspaceId" = 'cb00516d621a641b5ac5e72cf' AND "id" = 'demo_foll_1'
UNION ALL
SELECT 'Post count', COUNT(*) FROM "Post" WHERE "id" LIKE 'demo_post_%'
UNION ALL
SELECT 'PostPlatform count', COUNT(*) FROM "PostPlatform" WHERE "postId" LIKE 'demo_post_%';
