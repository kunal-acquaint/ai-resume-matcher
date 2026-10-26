import { zodResolver } from '@hookform/resolvers/zod';
import { CANDIDATE_LIMITS, MAX_PAGE_SIZE } from '@resume-matcher/shared';
import { Briefcase } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { describedBy } from '@/components/ui/form-ids';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState, LoadingState, QueryError } from '@/components/ui/States';
import { useJobs } from '@/features/jobs/job-queries';
import { getErrorMessage } from '@/lib/api/api-error';
import { useUploadResume } from './candidate-queries';
import { RESUME_ACCEPT, validateResumeFile } from './resume-file';

const matchSchema = z.object({
  jobId: z.string().min(1, 'Select a job'),
  candidateName: z
    .string()
    .trim()
    .min(1, 'Enter the candidate’s name')
    .max(CANDIDATE_LIMITS.nameMaxLength, `At most ${CANDIDATE_LIMITS.nameMaxLength} characters`),
  candidateEmail: z.union([z.literal(''), z.email('Enter a valid email address')]),
});

type MatchForm = z.infer<typeof matchSchema>;

export function MatchResumePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const jobs = useJobs({ status: 'active', limit: MAX_PAGE_SIZE });
  const upload = useUploadResume();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>();

  // Only active jobs whose skills are ready can receive resumes.
  const eligibleJobs = jobs.data?.items.filter((job) => job.skillsStatus === 'ready') ?? [];
  const requestedJobId = params.get('jobId') ?? '';
  const preselected = eligibleJobs.some((job) => job.id === requestedJobId) ? requestedJobId : '';

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<MatchForm>({
    resolver: zodResolver(matchSchema),
    values: { jobId: preselected, candidateName: '', candidateEmail: '' },
    resetOptions: { keepDirtyValues: true },
  });
  const selectedJobId = useWatch({ control, name: 'jobId' });
  const selectedJob = eligibleJobs.find((job) => job.id === selectedJobId);

  /** Invalid files are rejected right away (the drop zone stays visible with the error). */
  const changeFile = (next: File | null) => {
    const invalid = next ? validateResumeFile(next) : undefined;
    setFile(invalid ? null : next);
    setFileError(invalid);
  };

  const onSubmit = handleSubmit(({ jobId, candidateName, candidateEmail }) => {
    const invalidFile = validateResumeFile(file);
    if (invalidFile || !file) {
      setFileError(invalidFile);
      return;
    }
    upload.mutate(
      { jobId, candidateName, candidateEmail: candidateEmail || undefined, file },
      {
        onSuccess: (candidate) => {
          toast.success(
            `${candidate.candidateName} scored ${Math.round(candidate.finalScore * 100)}%`,
          );
          void navigate(`/candidates/${candidate.id}`);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  });

  if (jobs.isPending) {
    return <LoadingState label="Loading jobs" />;
  }
  if (jobs.isError) {
    return <QueryError error={jobs.error} onRetry={() => void jobs.refetch()} />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Match Resume"
        description="Upload one PDF resume to score it against a job. The result is ready in seconds."
      />

      {eligibleJobs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            icon={Briefcase}
            title="No job is ready for matching"
            description="Resumes can be matched against active jobs whose required skills are ready."
            action={
              <Link
                to="/jobs"
                className="inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
              >
                Go to jobs
              </Link>
            }
          />
        </div>
      ) : (
        <form
          noValidate
          onSubmit={(event) => void onSubmit(event)}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {requestedJobId && !preselected && (
            <Alert variant="info">
              The requested job isn’t available for matching (it may be closed or its skills aren’t
              ready). Choose another job.
            </Alert>
          )}

          <FormField htmlFor="jobId" label="Job" error={errors.jobId?.message}>
            <Select
              id="jobId"
              invalid={!!errors.jobId}
              aria-describedby={errors.jobId ? describedBy('jobId') : undefined}
              {...register('jobId')}
            >
              <option value="">Select a job…</option>
              {eligibleJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </Select>
          </FormField>

          {selectedJob && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-700">The resume is checked for:</p>
              <p className="mt-1 text-slate-600">
                {selectedJob.requiredSkills.map((skill) => skill.name).join(', ')}
              </p>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              htmlFor="candidateName"
              label="Candidate name"
              error={errors.candidateName?.message}
            >
              <Input
                id="candidateName"
                autoComplete="off"
                invalid={!!errors.candidateName}
                aria-describedby={errors.candidateName ? describedBy('candidateName') : undefined}
                {...register('candidateName')}
              />
            </FormField>
            <FormField
              htmlFor="candidateEmail"
              label="Email (optional)"
              error={errors.candidateEmail?.message}
            >
              <Input
                id="candidateEmail"
                type="email"
                autoComplete="off"
                invalid={!!errors.candidateEmail}
                aria-describedby={errors.candidateEmail ? describedBy('candidateEmail') : undefined}
                {...register('candidateEmail')}
              />
            </FormField>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-slate-700">Resume</p>
            <FileDropzone
              file={file}
              onFileChange={changeFile}
              accept={RESUME_ACCEPT}
              hint="One PDF with selectable text, up to 5 MB"
              error={fileError}
              disabled={upload.isPending}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={upload.isPending}>
              {upload.isPending ? 'Scoring…' : 'Match resume'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
