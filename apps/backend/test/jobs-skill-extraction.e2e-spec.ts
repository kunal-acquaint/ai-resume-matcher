import { getModelToken } from '@nestjs/mongoose';
import type { ApiErrorResponse, Job } from '@resume-matcher/shared';
import type { Model } from 'mongoose';
import type TestAgent from 'supertest/lib/agent.js';
import { JobsService } from '../src/modules/jobs/jobs.service.js';
import { Job as JobEntity } from '../src/modules/jobs/schemas/job.schema.js';
import { createTestApp, type TestContext } from './utils/test-app.js';

const JD =
  'Backend developer needed: Node.js, TypeScript and PostgreSQL, deploying with Docker on AWS.';
const JD_WITHOUT_KNOWN_SKILLS =
  'We are looking for a friendly, motivated person to join our growing team as soon as possible.';

// Separate app with a slow stand-in, so the "extracting" state can be observed.
describe('Job skill extraction lifecycle (e2e)', () => {
  let ctx: TestContext;
  let admin: TestAgent;

  beforeAll(async () => {
    ctx = await createTestApp('jobs-extraction-e2e', { AI_STUB_DELAY_MS: '300' });
    await ctx.createAdmin('admin@example.com');
    admin = await ctx.loginAs('admin@example.com');
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it('blocks description and skill edits while extracting, but allows title and status', async () => {
    const created = (await admin.post('/api/jobs').send({ title: 'Backend', description: JD }))
      .body as Job;
    expect(created.skillsStatus).toBe('extracting');

    const conflict = await admin
      .patch(`/api/jobs/${created.id}`)
      .send({ requiredSkills: [{ name: 'Go' }] })
      .expect(409);
    expect((conflict.body as ApiErrorResponse).message).toMatch(/still being extracted/);
    await admin
      .patch(`/api/jobs/${created.id}`)
      .send({ description: `${JD} Updated.` })
      .expect(409);
    await admin.post(`/api/jobs/${created.id}/extract-skills`).expect(409);
    await admin.patch(`/api/jobs/${created.id}`).send({ title: 'Backend Developer' }).expect(200);

    await ctx.waitForBackgroundTasks();
    const job = (await admin.get(`/api/jobs/${created.id}`).expect(200)).body as Job;
    expect(job).toMatchObject({ title: 'Backend Developer', skillsStatus: 'ready' });
    expect(job.requiredSkills.map((s) => s.name)).toEqual([
      'Node.js',
      'TypeScript',
      'PostgreSQL',
      'Docker',
      'AWS',
    ]);
  });

  it('marks extraction failed when no skills are found; manual skills make the job ready', async () => {
    const created = (
      await admin.post('/api/jobs').send({ title: 'Vague', description: JD_WITHOUT_KNOWN_SKILLS })
    ).body as Job;
    await ctx.waitForBackgroundTasks();

    const failed = (await admin.get(`/api/jobs/${created.id}`).expect(200)).body as Job;
    expect(failed.skillsStatus).toBe('failed');

    const fixed = await admin
      .patch(`/api/jobs/${created.id}`)
      .send({ requiredSkills: [{ name: 'Communication' }] })
      .expect(200);
    expect(fixed.body).toMatchObject({ skillsStatus: 'ready' });
  });

  it('marks extractions interrupted by a restart as failed on startup', async () => {
    const jobModel = ctx.app.get<Model<JobEntity>>(getModelToken(JobEntity.name));
    const stuck = await jobModel.create({
      title: 'Stuck',
      description: JD,
      embedding: [1],
      skillsStatus: 'extracting',
    });

    await ctx.app.get(JobsService).onApplicationBootstrap();

    expect((await jobModel.findById(stuck.id).lean())?.skillsStatus).toBe('failed');
  });
});
