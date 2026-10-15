import type { Job } from '@resume-matcher/shared';
import type TestAgent from 'supertest/lib/agent.js';
import { makePdf } from './make-pdf.js';
import type { TestContext } from './test-app.js';

/** Mentions 8 dictionary skills: React, TypeScript, REST APIs, Node.js, Express, MongoDB, Docker, AWS. */
export const FULL_STACK_JD =
  'We are hiring a Senior Full-Stack Developer. You will build web apps with React and ' +
  'TypeScript, REST APIs with Node.js and Express, and store data in MongoDB. ' +
  'Experience with Docker and AWS is a plus.';

/** Strong match: every JD skill except AWS. */
export const STRONG_RESUME = [
  'Aarav Mehta - Senior Full-Stack Engineer',
  'Summary: Seven years building production web applications with React and TypeScript.',
  'Experience: Designed REST APIs with Node.js and Express backed by MongoDB for a SaaS platform.',
  'Rebuilt the frontend in TypeScript and React, cutting page load time by forty percent.',
  'Packaged services with Docker and set up automated test pipelines.',
  'Education: B.E. Computer Engineering.',
];

/** Out-of-domain: none of the JD skills. */
export const WEAK_RESUME = [
  'Priya Nair - Data Analyst',
  'Summary: Five years turning retail sales data into business insights for regional managers.',
  'Skills: Excel pivot tables, SQL queries and stored procedures, Power BI dashboards, Tableau.',
  'Experience: Built weekly reporting that saved the finance team twelve hours per week.',
  'Education: MBA in Business Analytics.',
];

/** Creates a job and waits until its (stand-in) skill extraction has finished. */
export async function createReadyJob(
  ctx: TestContext,
  agent: TestAgent,
  title: string,
  description = FULL_STACK_JD,
): Promise<Job> {
  const res = await agent.post('/api/jobs').send({ title, description }).expect(201);
  await ctx.waitForBackgroundTasks();
  return (await agent.get(`/api/jobs/${(res.body as Job).id}`).expect(200)).body as Job;
}

export interface UploadOptions {
  name?: string;
  email?: string;
  filename?: string;
}

/** Starts a resume upload request built from text lines; chain `.expect()` on the result. */
export function uploadResume(
  agent: TestAgent,
  jobId: string,
  lines: readonly string[],
  { name = 'Test Candidate', email, filename = 'resume.pdf' }: UploadOptions = {},
) {
  const req = agent.post(`/api/jobs/${jobId}/candidates`).field('candidateName', name);
  if (email !== undefined) req.field('candidateEmail', email);
  return req.attach('file', makePdf(lines), { filename, contentType: 'application/pdf' });
}
