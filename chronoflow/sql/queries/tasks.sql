-- name: ListOpenTasksByUser :many
SELECT * FROM tasks
WHERE user_id = $1 AND status IN ('todo','scheduled')
ORDER BY priority_score DESC, deadline NULLS LAST;

-- name: InsertTask :one
INSERT INTO tasks (tenant_id,user_id,source,external_id,title,description,est_minutes,deadline,importance,status,link,context_tags,priority_score)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
RETURNING *;
