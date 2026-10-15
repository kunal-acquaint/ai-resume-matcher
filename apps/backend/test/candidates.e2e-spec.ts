import { getModelToken } from '@nestjs/mongoose';
import {
  CANDIDATE_LIMITS,
  type ApiErrorResponse,
  type Candidate,
  type CandidateSummary,
  type Job,
  type Paginated,
} from '@resume-matcher/shared';
import type { Model } from 'mongoose';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { Candidate as CandidateEntity } from '../src/modules/candidates/schemas/candidate.schema.js';
import { Job as JobEntity } from '../src/modules/jobs/schemas/job.schema.js';
import { createReadyJob, STRONG_RESUME, uploadResume, WEAK_RESUME } from './utils/fixtures.js';
import { makePdf } from './utils/make-pdf.js';
import { createTestApp, type TestContext } from './utils/test-app.js';

const message = (res: { body: unknown }) => (res.body as ApiErrorResponse).message;

describe('Candidates (e2e)', () => {
  let ctx: TestContext;
  let admin: TestAgent;
  let job: Job;

  const upload = () => admin.post(`/api/jobs/${job.id}/candidates`);
  const list = async (query: string) =>
    (await admin.get(`/api/candidates?${query}`).expect(200)).body as Paginated<CandidateSummary>;
  const get = async (id: string) =>
    (await admin.get(`/api/candidates/${id}`).expect(200)).body as Candidate;

  beforeAll(async () => {
    ctx = await createTestApp('candidates-e2e');
    await ctx.createAdmin('admin@example.com', undefined, 'Alice Admin');
    admin = await ctx.loginAs('admin@example.com');
    job = await createReadyJob(ctx, admin, 'Senior Full-Stack Developer');
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it('requires authentication', async () => {
    await request(ctx.app.getHttpServer()).get('/api/candidates').expect(401);
    await request(ctx.app.getHttpServer())
      .post(`/api/jobs/${job.id}/candidates`)
      .field('candidateName', 'X')
      .expect(401);
  });

  describe('POST /api/jobs/:jobId/candidates', () => {
    let strong: Candidate;

    it('scores a resume immediately and explains the skill match', async () => {
      const res = await uploadResume(admin, job.id, STRONG_RESUME, {
        name: '  Aarav Mehta ',
        email: 'Aarav@Example.com',
        filename: 'aarav.pdf',
      }).expect(201);
      strong = res.body as Candidate;

      expect(strong).toMatchObject({
        candidateName: 'Aarav Mehta',
        candidateEmail: 'aarav@example.com',
        job: { id: job.id, title: 'Senior Full-Stack Developer' },
        fileName: 'aarav.pdf',
        matchedSkillCount: 7,
        requiredSkillCount: 8,
        uploadedBy: { name: 'Alice Admin' },
      });
      expect(strong.coverage).toBeCloseTo(7 / 8);
      expect(strong.skillMatch.missing).toEqual(['AWS']);
      expect(strong.skillMatch.matched).toContainEqual({
        skill: 'React',
        evidence: 'text',
        term: 'React',
      });
      expect(strong.finalScore).toBeGreaterThan(0);
      expect(strong.finalScore).toBeLessThanOrEqual(1);
      // Internal fields stay internal.
      expect(Object.keys(strong).toSorted()).toEqual(
        [
          'candidateEmail',
          'candidateName',
          'coverage',
          'createdAt',
          'fileName',
          'finalScore',
          'id',
          'job',
          'matchedSkillCount',
          'requiredSkillCount',
          'semanticScore',
          'skillMatch',
          'updatedAt',
          'uploadedBy',
        ].toSorted(),
      );
    });

    it('ranks an out-of-domain resume lower', async () => {
      const res = await uploadResume(admin, job.id, WEAK_RESUME, { name: 'Priya Nair' }).expect(
        201,
      );
      const weak = res.body as Candidate;

      expect(weak.coverage).toBe(0);
      expect(weak.semanticScore).toBeLessThan(strong.semanticScore);
      expect(weak.finalScore).toBeLessThan(strong.finalScore);
      expect(weak.candidateEmail).toBeNull();
    });

    it('rejects the same resume for the same job, even under another file name', async () => {
      const res = await uploadResume(admin, job.id, STRONG_RESUME, { filename: 'copy.pdf' }).expect(
        409,
      );

      expect(message(res)).toBe('Resume already uploaded.');
    });

    it('accepts the same resume for a different job, and again after deletion', async () => {
      const other = await createReadyJob(ctx, admin, 'Another Full-Stack Role');
      const res = await uploadResume(admin, other.id, STRONG_RESUME).expect(201);

      await admin.delete(`/api/candidates/${(res.body as Candidate).id}`).expect(204);
      await uploadResume(admin, other.id, STRONG_RESUME).expect(201);
    });

    it('treats an empty email as absent', async () => {
      const res = await uploadResume(admin, job.id, [...WEAK_RESUME, 'Variant A'], {
        email: '',
      }).expect(201);

      expect((res.body as Candidate).candidateEmail).toBeNull();
    });
  });

  describe('upload validation', () => {
    it('requires a file', async () => {
      const res = await upload().field('candidateName', 'No File').expect(400);
      expect(message(res)).toBe('A PDF file is required (form field "file")');
    });

    it.each([
      ['a missing name', { candidateEmail: 'a@example.com' }],
      ['an invalid email', { candidateName: 'Bad Email', candidateEmail: 'not-an-email' }],
      ['a too long name', { candidateName: 'x'.repeat(CANDIDATE_LIMITS.nameMaxLength + 1) }],
    ])('rejects %s with 400', async (_case, fields) => {
      const req = upload();
      for (const [key, value] of Object.entries(fields)) req.field(key, value);
      await req
        .attach('file', makePdf(STRONG_RESUME), {
          filename: 'r.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);
    });

    it('rejects non-PDF files', async () => {
      const res = await upload()
        .field('candidateName', 'Text File')
        .attach('file', Buffer.from('plain text resume'), {
          filename: 'resume.txt',
          contentType: 'text/plain',
        })
        .expect(400);
      expect(message(res)).toBe('Only PDF files are allowed');
    });

    it('rejects files that only pretend to be PDFs', async () => {
      const res = await upload()
        .field('candidateName', 'Fake PDF')
        .attach('file', Buffer.from('not really a pdf'), {
          filename: 'resume.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);
      expect(message(res)).toBe('The file is not a valid PDF');
    });

    it('rejects scanned PDFs without a text layer with 422', async () => {
      const res = await uploadResume(admin, job.id, []).expect(422);
      expect(message(res)).toBe('No text layer found; OCR is not supported.');
    });

    it('rejects files over 5 MB with 413', async () => {
      const big = Buffer.concat([
        makePdf(STRONG_RESUME),
        Buffer.alloc(CANDIDATE_LIMITS.maxFileSize),
      ]);
      await upload()
        .field('candidateName', 'Big File')
        .attach('file', big, { filename: 'big.pdf', contentType: 'application/pdf' })
        .expect(413);
    });

    it('rejects more than one file and unexpected field names', async () => {
      const pdf = makePdf(STRONG_RESUME);
      await upload()
        .field('candidateName', 'Two Files')
        .attach('file', pdf, { filename: 'a.pdf', contentType: 'application/pdf' })
        .attach('file', pdf, { filename: 'b.pdf', contentType: 'application/pdf' })
        .expect(400);
      await upload()
        .field('candidateName', 'Wrong Field')
        .attach('resume', pdf, { filename: 'a.pdf', contentType: 'application/pdf' })
        .expect(400);
    });
  });

  describe('job state', () => {
    it('rejects uploads to a closed job', async () => {
      const closed = await createReadyJob(ctx, admin, 'Closed Role');
      await admin.patch(`/api/jobs/${closed.id}`).send({ status: 'closed' }).expect(200);

      const res = await uploadResume(admin, closed.id, STRONG_RESUME).expect(409);
      expect(message(res)).toBe('This job is closed');
    });

    it('rejects uploads while the job has no usable skills', async () => {
      const vague = await createReadyJob(
        ctx,
        admin,
        'Vague Role',
        'We are looking for a friendly, motivated person to join our growing team soon.',
      );
      expect(vague.skillsStatus).toBe('failed');

      const res = await uploadResume(admin, vague.id, STRONG_RESUME).expect(409);
      expect(message(res)).toBe('Required skills for this job are not ready yet');
    });

    it('returns 404 for an unknown job and 400 for a malformed id', async () => {
      await uploadResume(admin, '6720f1c2a1b2c3d4e5f60718', STRONG_RESUME).expect(404);
      await uploadResume(admin, 'not-an-id', STRONG_RESUME).expect(400);
    });
  });

  describe('GET /api/candidates', () => {
    let listJob: Job;

    beforeAll(async () => {
      listJob = await createReadyJob(ctx, admin, 'Listing Role');
      await uploadResume(admin, listJob.id, WEAK_RESUME, { name: 'Priya Nair' }).expect(201);
      await uploadResume(admin, listJob.id, STRONG_RESUME, { name: 'Aarav Mehta' }).expect(201);
      await uploadResume(admin, listJob.id, [...WEAK_RESUME, 'Variant B'], {
        name: 'Bob Analyst',
      }).expect(201);
    });

    it('lists a job’s candidates newest first by default, without skill details', async () => {
      const page = await list(`jobId=${listJob.id}`);

      expect(page.total).toBe(3);
      expect(page.items.map((c) => c.candidateName)).toEqual([
        'Bob Analyst',
        'Aarav Mehta',
        'Priya Nair',
      ]);
      expect(page.items[0]).toMatchObject({
        job: { title: 'Listing Role' },
        uploadedBy: { name: 'Alice Admin' },
        requiredSkillCount: 8,
      });
      expect(page.items[0]).not.toHaveProperty('skillMatch');
    });

    it('sorts by score, best first', async () => {
      const page = await list(`jobId=${listJob.id}&sort=score`);

      expect(page.items[0]?.candidateName).toBe('Aarav Mehta');
      const scores = page.items.map((c) => c.finalScore);
      expect(scores).toEqual(scores.toSorted((a, b) => b - a));
    });

    it('searches candidate names case-insensitively and paginates', async () => {
      const search = await list(`jobId=${listJob.id}&search=NAIR`);
      const paged = await list(`jobId=${listJob.id}&page=2&limit=2`);

      expect(search.items.map((c) => c.candidateName)).toEqual(['Priya Nair']);
      expect(paged).toMatchObject({ total: 3, page: 2, limit: 2 });
      expect(paged.items).toHaveLength(1);
    });

    it.each(['jobId=not-an-id', 'sort=name', 'limit=0'])('rejects %s with 400', async (query) => {
      await admin.get(`/api/candidates?${query}`).expect(400);
    });
  });

  describe('GET and DELETE /api/candidates/:id', () => {
    it('returns details, then 404 after deletion', async () => {
      const created = (
        await uploadResume(admin, job.id, [...STRONG_RESUME, 'Variant C']).expect(201)
      ).body as Candidate;

      const detail = (await admin.get(`/api/candidates/${created.id}`).expect(200))
        .body as Candidate;
      expect(detail.skillMatch.matched.length).toBe(detail.matchedSkillCount);

      await admin.delete(`/api/candidates/${created.id}`).expect(204);
      await admin.get(`/api/candidates/${created.id}`).expect(404);
      await admin.delete(`/api/candidates/${created.id}`).expect(404);
      await admin.get('/api/candidates/not-an-id').expect(400);
    });
  });

  describe('rescoring when the job changes', () => {
    let rescoreJob: Job;
    let strongId: string;
    let weakId: string;

    beforeAll(async () => {
      rescoreJob = await createReadyJob(ctx, admin, 'Rescore Role');
      strongId = (
        (await uploadResume(admin, rescoreJob.id, STRONG_RESUME).expect(201)).body as Candidate
      ).id;
      weakId = (
        (await uploadResume(admin, rescoreJob.id, WEAK_RESUME).expect(201)).body as Candidate
      ).id;
    });

    it('recomputes skill matches and scores when the skills are edited', async () => {
      await admin
        .patch(`/api/jobs/${rescoreJob.id}`)
        .send({ requiredSkills: [{ name: 'Excel' }, { name: 'Power BI', aliases: ['PowerBI'] }] })
        .expect(200);

      const [strong, weak] = await Promise.all([get(strongId), get(weakId)]);
      expect(weak).toMatchObject({ coverage: 1, matchedSkillCount: 2, requiredSkillCount: 2 });
      expect(strong.coverage).toBe(0);
      expect(strong.skillMatch.missing).toEqual(['Excel', 'Power BI']);
    });

    it('recomputes semantic scores when the description changes', async () => {
      const before = await get(weakId);

      await admin
        .patch(`/api/jobs/${rescoreJob.id}`)
        .send({
          description:
            'Data analyst: Excel pivot tables, SQL queries and Power BI dashboards for retail sales reporting.',
        })
        .expect(200);

      const after = await get(weakId);
      expect(after.semanticScore).toBeGreaterThan(before.semanticScore);
      expect(Date.parse(after.updatedAt)).toBeGreaterThan(Date.parse(before.updatedAt));
    });

    it('re-embeds data produced by a different embedding model before rescoring', async () => {
      const jobModel = ctx.app.get<Model<JobEntity>>(getModelToken(JobEntity.name));
      const candidateModel = ctx.app.get<Model<CandidateEntity>>(
        getModelToken(CandidateEntity.name),
      );
      await jobModel.updateOne(
        { _id: rescoreJob.id },
        { embeddingModel: 'old-model', embedding: [1, 0, 0] },
      );
      await candidateModel.updateOne(
        { _id: weakId },
        {
          embeddingModel: 'old-model',
          chunks: [{ text: 'old', embedding: [1, 0, 0], similarity: 1 }],
        },
      );

      await admin
        .patch(`/api/jobs/${rescoreJob.id}`)
        .send({ requiredSkills: [{ name: 'SQL' }] })
        .expect(200);

      const storedJob = await jobModel.findById(rescoreJob.id).lean();
      const weak = await candidateModel.findById(weakId).select('+chunks').lean();
      expect(storedJob?.embeddingModel).toBe('hashing-stub');
      expect(storedJob?.embedding).toHaveLength(384);
      expect(weak?.embeddingModel).toBe('hashing-stub');
      expect(weak?.chunks[0]?.embedding).toHaveLength(384);
      expect((await get(weakId)).coverage).toBe(1);
    });

    it('deletes the candidates together with their job', async () => {
      await admin.delete(`/api/jobs/${rescoreJob.id}`).expect(204);

      await admin.get(`/api/candidates/${strongId}`).expect(404);
      await admin.get(`/api/candidates/${weakId}`).expect(404);
    });
  });
});
