import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import type { ApiErrorResponse, Job, Paginated } from '@resume-matcher/shared';
import type { Connection, Model } from 'mongoose';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { Job as JobEntity } from '../src/modules/jobs/schemas/job.schema.js';
import { createTestApp, type TestContext } from './utils/test-app.js';

const FULL_STACK_JD =
  'We are hiring a Senior Full-Stack Developer. You will build web apps with React and ' +
  'TypeScript, REST APIs with Node.js and Express, and store data in MongoDB. ' +
  'Experience with Docker and AWS is a plus.';

describe('Jobs (e2e)', () => {
  let ctx: TestContext;
  let admin: TestAgent;
  let jobModel: Model<JobEntity>;

  async function createJob(title: string, description = FULL_STACK_JD): Promise<Job> {
    const res = await admin.post('/api/jobs').send({ title, description }).expect(201);
    await ctx.waitForBackgroundTasks();
    return (await admin.get(`/api/jobs/${(res.body as Job).id}`).expect(200)).body as Job;
  }

  beforeAll(async () => {
    ctx = await createTestApp('jobs-e2e');
    await ctx.createAdmin('admin@example.com', undefined, 'Alice Admin');
    admin = await ctx.loginAs('admin@example.com');
    jobModel = ctx.app.get(getModelToken(JobEntity.name));
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it('requires authentication', async () => {
    await request(ctx.app.getHttpServer()).get('/api/jobs').expect(401);
  });

  describe('POST /api/jobs', () => {
    it('creates an active job, embeds the JD and extracts skills in the background', async () => {
      const res = await admin
        .post('/api/jobs')
        .send({ title: '  Senior Full-Stack Developer ', description: FULL_STACK_JD })
        .expect(201);
      const created = res.body as Job;

      expect(created).toMatchObject({
        title: 'Senior Full-Stack Developer',
        status: 'active',
        candidateCount: 0,
        createdBy: { name: 'Alice Admin' },
      });
      expect(created).not.toHaveProperty('embedding');
      expect((await jobModel.findById(created.id).lean())?.embedding).toHaveLength(384);

      await ctx.waitForBackgroundTasks();
      const job = (await admin.get(`/api/jobs/${created.id}`).expect(200)).body as Job;

      expect(job.skillsStatus).toBe('ready');
      expect(job.requiredSkills.map((s) => s.name)).toEqual([
        'React',
        'TypeScript',
        'REST APIs',
        'Node.js',
        'Express',
        'MongoDB',
        'Docker',
        'AWS',
      ]);
      expect(job.requiredSkills[0]).toEqual({
        name: 'React',
        aliases: ['React.js', 'ReactJS'],
        source: 'ai',
      });
    });

    it.each([
      [{ title: 'Too short', description: 'Short JD' }],
      [{ description: FULL_STACK_JD }],
      [{ title: 'x'.repeat(121), description: FULL_STACK_JD }],
      [{ title: 'Valid', description: FULL_STACK_JD, status: 'closed' }],
    ])('rejects invalid input %o with 400', async (body) => {
      await admin.post('/api/jobs').send(body).expect(400);
    });
  });

  describe('GET /api/jobs', () => {
    beforeAll(async () => {
      await jobModel.deleteMany({});
      for (const title of [
        'Backend Engineer',
        'Frontend Engineer',
        'Data Analyst',
        'C++ Developer',
      ]) {
        await createJob(title);
      }
      const analyst = await jobModel.findOne({ title: 'Data Analyst' });
      await admin.patch(`/api/jobs/${analyst?.id}`).send({ status: 'closed' }).expect(200);
    });

    it('paginates newest first', async () => {
      const res = await admin.get('/api/jobs?page=1&limit=3').expect(200);
      const page = res.body as Paginated<Job>;

      expect(page).toMatchObject({ total: 4, page: 1, limit: 3 });
      expect(page.items.map((j) => j.title)).toEqual([
        'C++ Developer',
        'Data Analyst',
        'Frontend Engineer',
      ]);

      const second = (await admin.get('/api/jobs?page=2&limit=3').expect(200))
        .body as Paginated<Job>;
      expect(second.items.map((j) => j.title)).toEqual(['Backend Engineer']);
    });

    it('filters by status', async () => {
      const res = await admin.get('/api/jobs?status=closed').expect(200);

      expect((res.body as Paginated<Job>).items.map((j) => j.title)).toEqual(['Data Analyst']);
    });

    it('searches titles case-insensitively, treating regex characters literally', async () => {
      const engineers = (await admin.get('/api/jobs?search=ENGINEER').expect(200))
        .body as Paginated<Job>;
      const cpp = (await admin.get('/api/jobs?search=C%2B%2B').expect(200)).body as Paginated<Job>;

      expect(engineers.total).toBe(2);
      expect(cpp.items.map((j) => j.title)).toEqual(['C++ Developer']);
    });

    it.each(['page=0', 'limit=101', 'status=archived', 'limit=abc'])(
      'rejects an invalid query (%s) with 400',
      async (query) => {
        await admin.get(`/api/jobs?${query}`).expect(400);
      },
    );
  });

  describe('GET /api/jobs/:id', () => {
    it('returns 404 for an unknown job and 400 for a malformed id', async () => {
      await admin.get('/api/jobs/6720f1c2a1b2c3d4e5f60718').expect(404);
      await admin.get('/api/jobs/not-an-id').expect(400);
    });

    it('shows a removed creator as null', async () => {
      const { id } = await ctx.createAdmin('temp@example.com');
      const temp = await ctx.loginAs('temp@example.com');
      const res = await temp.post('/api/jobs').send({ title: 'Temp', description: FULL_STACK_JD });
      await admin.delete(`/api/users/${id}`).expect(204);

      const job = (await admin.get(`/api/jobs/${(res.body as Job).id}`).expect(200)).body as Job;

      expect(job.createdBy).toBeNull();
    });
  });

  describe('PATCH /api/jobs/:id', () => {
    it('updates title and status', async () => {
      const job = await createJob('Old Title');

      const res = await admin
        .patch(`/api/jobs/${job.id}`)
        .send({ title: 'New Title', status: 'closed' })
        .expect(200);

      expect(res.body).toMatchObject({ title: 'New Title', status: 'closed' });
    });

    it('re-embeds the job when the description changes', async () => {
      const job = await createJob('Embedding Check');
      const before = (await jobModel.findById(job.id).lean())?.embedding;

      await admin
        .patch(`/api/jobs/${job.id}`)
        .send({ description: 'Data analyst role: Excel, SQL and Power BI dashboards for retail.' })
        .expect(200);

      const after = (await jobModel.findById(job.id).lean())?.embedding;
      expect(after).toHaveLength(384);
      expect(after).not.toEqual(before);
    });

    it('replaces skills, keeping the source of existing ones and marking new ones manual', async () => {
      const job = await createJob('Skill Edit');

      const res = await admin
        .patch(`/api/jobs/${job.id}`)
        .send({
          requiredSkills: [
            { name: 'react', aliases: ['ReactJS'] },
            { name: 'Kubernetes', aliases: ['K8s'] },
            { name: 'Kubernetes' },
          ],
        })
        .expect(200);
      const updated = res.body as Job;

      expect(updated.skillsStatus).toBe('ready');
      expect(updated.requiredSkills).toEqual([
        { name: 'react', aliases: ['ReactJS'], source: 'ai' },
        { name: 'Kubernetes', aliases: ['K8s'], source: 'manual' },
      ]);
      const stored = await jobModel.findById(job.id).lean();
      expect(stored?.requiredSkills.every((s) => s.embedding.length === 384)).toBe(true);
    });

    it.each([
      [{ requiredSkills: [] }],
      [{ requiredSkills: Array.from({ length: 31 }, (_, i) => ({ name: `Skill ${i}` })) }],
      [{ requiredSkills: [{ name: '' }] }],
      [{ requiredSkills: [{ name: 'React', aliases: 'ReactJS' }] }],
    ])('rejects invalid skills %o with 400', async (body) => {
      const job = await createJob('Invalid Skills');
      await admin.patch(`/api/jobs/${job.id}`).send(body).expect(400);
    });
  });

  it('POST /api/jobs/:id/extract-skills replaces manual skills with freshly extracted ones', async () => {
    const job = await createJob('Re-extract');
    await admin
      .patch(`/api/jobs/${job.id}`)
      .send({ requiredSkills: [{ name: 'Cobol' }] })
      .expect(200);

    const res = await admin.post(`/api/jobs/${job.id}/extract-skills`).expect(202);
    expect((res.body as Job).skillsStatus).toBe('extracting');
    await ctx.waitForBackgroundTasks();

    const after = (await admin.get(`/api/jobs/${job.id}`).expect(200)).body as Job;
    expect(after.skillsStatus).toBe('ready');
    expect(after.requiredSkills.map((s) => s.name)).toContain('React');
    expect(after.requiredSkills.map((s) => s.name)).not.toContain('Cobol');
  });

  describe('DELETE /api/jobs/:id', () => {
    it('deletes the job and its candidates', async () => {
      const job = await createJob('To Delete');
      const candidates = ctx.app.get<Connection>(getConnectionToken()).collection('candidates');
      const jobObjectId = (await jobModel.findById(job.id))?._id;
      await candidates.insertMany([{ jobId: jobObjectId }, { jobId: jobObjectId }]);

      const before = (await admin.get(`/api/jobs/${job.id}`).expect(200)).body as Job;
      expect(before.candidateCount).toBe(2);

      await admin.delete(`/api/jobs/${job.id}`).expect(204);

      await admin.get(`/api/jobs/${job.id}`).expect(404);
      expect(await candidates.countDocuments({ jobId: jobObjectId })).toBe(0);
    });

    it('returns 404 for an unknown job', async () => {
      const res = await admin.delete('/api/jobs/6720f1c2a1b2c3d4e5f60718').expect(404);
      expect((res.body as ApiErrorResponse).message).toBe('Job not found');
    });
  });
});
