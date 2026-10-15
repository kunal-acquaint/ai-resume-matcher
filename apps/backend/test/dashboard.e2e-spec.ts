import { getConnectionToken } from '@nestjs/mongoose';
import type { Candidate, DashboardStats } from '@resume-matcher/shared';
import type { Connection } from 'mongoose';
import { Types } from 'mongoose';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { createReadyJob, STRONG_RESUME, uploadResume, WEAK_RESUME } from './utils/fixtures.js';
import { createTestApp, type TestContext } from './utils/test-app.js';

describe('Dashboard (e2e)', () => {
  let ctx: TestContext;
  let admin: TestAgent;

  const stats = async () =>
    (await admin.get('/api/dashboard/stats').expect(200)).body as DashboardStats;

  beforeAll(async () => {
    ctx = await createTestApp('dashboard-e2e');
    await ctx.createAdmin('admin@example.com');
    admin = await ctx.loginAs('admin@example.com');
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it('requires authentication', async () => {
    await request(ctx.app.getHttpServer()).get('/api/dashboard/stats').expect(401);
  });

  it('reports zeros and no average when there is no data', async () => {
    await expect(stats()).resolves.toEqual({
      activeJobs: 0,
      totalResumes: 0,
      resumesThisWeek: 0,
      averageScore: null,
    });
  });

  it('counts active jobs, resumes, this week’s resumes and the average score', async () => {
    const active = await createReadyJob(ctx, admin, 'Active Role');
    const closed = await createReadyJob(ctx, admin, 'Closing Role');
    const scores: number[] = [];
    for (const lines of [STRONG_RESUME, WEAK_RESUME]) {
      scores.push(
        ((await uploadResume(admin, active.id, lines).expect(201)).body as Candidate).finalScore,
      );
    }
    const old = (await uploadResume(admin, closed.id, STRONG_RESUME).expect(201)).body as Candidate;
    scores.push(old.finalScore);
    await admin.patch(`/api/jobs/${closed.id}`).send({ status: 'closed' }).expect(200);

    // Backdate one resume beyond the 7-day window (bypassing Mongoose timestamps).
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    await ctx.app
      .get<Connection>(getConnectionToken())
      .collection('candidates')
      .updateOne({ _id: new Types.ObjectId(old.id) }, { $set: { createdAt: tenDaysAgo } });

    const result = await stats();

    expect(result).toMatchObject({ activeJobs: 1, totalResumes: 3, resumesThisWeek: 2 });
    expect(result.averageScore).toBeCloseTo(scores.reduce((a, b) => a + b, 0) / scores.length);
  });
});
