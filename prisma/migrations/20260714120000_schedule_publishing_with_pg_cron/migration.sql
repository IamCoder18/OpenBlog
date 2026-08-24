CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'openblog-publish-scheduled-posts',
  '* * * * *',
  $job$
    UPDATE "Post"
    SET
      "visibility" = 'PUBLIC',
      "publishedAt" = CURRENT_TIMESTAMP,
      "scheduledAt" = NULL,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE
      "visibility" = 'PRIVATE'
      AND "scheduledAt" <= CURRENT_TIMESTAMP
  $job$
);

SELECT cron.schedule(
  'openblog-prune-cron-history',
  '17 3 * * *',
  $job$
    DELETE FROM cron.job_run_details
    WHERE end_time < CURRENT_TIMESTAMP - INTERVAL '14 days'
  $job$
);
