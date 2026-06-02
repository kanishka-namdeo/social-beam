SELECT w.id as workspace_id, w."userId" as user_id, up.id as profile_id
FROM "Workspace" w
LEFT JOIN "UserProfile" up ON up."workspaceId" = w.id
LIMIT 5;
