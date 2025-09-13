-- name: UpsertEvent :one
INSERT INTO events (
  tenant_id,user_id,provider,external_id,recurring_master_id,original_start,
  title,start_at,end_at,tz,is_focus_block,focus_task_id,status,visibility,updated_hash
) VALUES (
  $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
)
ON CONFLICT (provider, external_id, original_start)
DO UPDATE SET
  title=EXCLUDED.title,
  start_at=EXCLUDED.start_at,
  end_at=EXCLUDED.end_at,
  tz=EXCLUDED.tz,
  is_focus_block=EXCLUDED.is_focus_block,
  focus_task_id=EXCLUDED.focus_task_id,
  status=EXCLUDED.status,
  visibility=EXCLUDED.visibility,
  updated_hash=EXCLUDED.updated_hash,
  updated_at=now()
RETURNING *;

-- name: ListEventsByWindow :many
SELECT * FROM events
WHERE user_id = $1 AND start_at < $3 AND end_at > $2
ORDER BY start_at;
