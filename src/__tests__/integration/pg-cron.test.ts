import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";

interface CronJob {
  jobname: string;
  schedule: string;
  command: string;
  active: boolean;
  database: string;
}

describe("pg_cron production scheduling", () => {
  it("installs active publishing and bounded-history jobs in the application database", async () => {
    const jobs = await prisma.$queryRaw<CronJob[]>`
      SELECT jobname, schedule, command, active, database
      FROM cron.job
      WHERE jobname IN (
        'openblog-publish-scheduled-posts',
        'openblog-prune-cron-history'
      )
      ORDER BY jobname
    `;

    expect(jobs).toHaveLength(2);
    expect(jobs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          jobname: "openblog-publish-scheduled-posts",
          schedule: "* * * * *",
          active: true,
          database: "openblog_test",
          command: expect.stringContaining('UPDATE "Post"'),
        }),
        expect.objectContaining({
          jobname: "openblog-prune-cron-history",
          schedule: "17 3 * * *",
          active: true,
          database: "openblog_test",
          command: expect.stringContaining("cron.job_run_details"),
        }),
      ])
    );
  });
});
