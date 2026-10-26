import { zodResolver } from '@hookform/resolvers/zod';
import { JOB_LIMITS, JOB_STATUSES, type Job } from '@resume-matcher/shared';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { describedBy } from '@/components/ui/form-ids';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { LoadingState, QueryError } from '@/components/ui/States';
import { Textarea } from '@/components/ui/Textarea';
import { getErrorMessage } from '@/lib/api/api-error';
import { useCreateJob, useExtractSkills, useJob, useUpdateJob } from './job-queries';

const jobSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Enter a job title')
    .max(JOB_LIMITS.titleMaxLength, `At most ${JOB_LIMITS.titleMaxLength} characters`),
  description: z
    .string()
    .trim()
    .min(
      JOB_LIMITS.descriptionMinLength,
      `Describe the role in at least ${JOB_LIMITS.descriptionMinLength} characters`,
    )
    .max(JOB_LIMITS.descriptionMaxLength, `At most ${JOB_LIMITS.descriptionMaxLength} characters`),
  status: z.enum(JOB_STATUSES),
});

type JobForm = z.infer<typeof jobSchema>;

interface JobFormProps {
  job?: Job;
}

/** Create (no job) or edit (job given) form. */
function JobForm({ job }: JobFormProps) {
  const navigate = useNavigate();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob(job?.id ?? '');
  const extractSkills = useExtractSkills(job?.id ?? '');
  const [reExtract, setReExtract] = useState(false);
  const mutation = job ? updateJob : createJob;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, dirtyFields },
  } = useForm<JobForm>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: job?.title ?? '',
      description: job?.description ?? '',
      status: job?.status ?? 'active',
    },
  });
  const descriptionLength = useWatch({ control, name: 'description' }).trim().length;
  const descriptionChanged = Boolean(job && dirtyFields.description);

  /** After an edit: optionally restart skill extraction, then go back to the job. */
  const afterSave = async (jobId: string) => {
    if (descriptionChanged && reExtract) {
      try {
        await extractSkills.mutateAsync();
        toast.success('Job saved. Re-extracting its required skills…');
      } catch (error) {
        toast.error(`Job saved, but skill extraction could not start: ${getErrorMessage(error)}`);
      }
    } else {
      toast.success('Job saved');
    }
    await navigate(`/jobs/${jobId}`);
  };

  const onSubmit = handleSubmit((values) => {
    if (!job) {
      createJob.mutate(
        { title: values.title, description: values.description },
        {
          onSuccess: (created) => {
            toast.success('Job created. Extracting its required skills…');
            void navigate(`/jobs/${created.id}`);
          },
        },
      );
      return;
    }

    updateJob.mutate(
      {
        title: values.title,
        status: values.status,
        ...(descriptionChanged && { description: values.description }),
      },
      {
        onSuccess: () => {
          void afterSave(job.id);
        },
      },
    );
  });

  return (
    <form
      noValidate
      onSubmit={(event) => void onSubmit(event)}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      {mutation.isError && <Alert>{getErrorMessage(mutation.error)}</Alert>}

      <FormField htmlFor="title" label="Title" error={errors.title?.message}>
        <Input
          id="title"
          invalid={!!errors.title}
          aria-describedby={errors.title ? describedBy('title') : undefined}
          placeholder="e.g. Senior Full-Stack Developer"
          {...register('title')}
        />
      </FormField>

      <FormField
        htmlFor="description"
        label="Job description"
        error={errors.description?.message}
        hint={`${descriptionLength.toLocaleString()} / ${JOB_LIMITS.descriptionMaxLength.toLocaleString()} characters. The required skills are extracted from this text.`}
      >
        <Textarea
          id="description"
          rows={14}
          invalid={!!errors.description}
          aria-describedby={describedBy('description')}
          placeholder="Paste the full job description: responsibilities, requirements, nice-to-haves…"
          {...register('description')}
        />
      </FormField>

      {job && (
        <FormField
          htmlFor="status"
          label="Status"
          hint="Closed jobs keep their candidates but accept no new resumes."
        >
          <Select
            id="status"
            aria-describedby={describedBy('status')}
            className="sm:w-48"
            {...register('status')}
          >
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </Select>
        </FormField>
      )}

      {descriptionChanged && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3 text-sm">
            <input
              id="re-extract"
              type="checkbox"
              checked={reExtract}
              onChange={(event) => setReExtract(event.target.checked)}
              aria-describedby="re-extract-hint"
              className="mt-0.5 size-4 rounded border-slate-300 accent-brand-600"
            />
            <div>
              <label htmlFor="re-extract" className="font-medium text-slate-900">
                Re-extract required skills
              </label>
              <p id="re-extract-hint" className="text-slate-500">
                Replaces the current skill list (including manual edits) with skills extracted from
                the new description. Candidate scores are recalculated either way.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Link
          to={job ? `/jobs/${job.id}` : '/jobs'}
          className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </Link>
        <Button type="submit" loading={mutation.isPending}>
          {job ? 'Save changes' : 'Create job'}
        </Button>
      </div>
    </form>
  );
}

export function NewJobPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New job"
        description="After saving, the required skills are extracted from the description automatically."
      />
      <JobForm />
    </div>
  );
}

export function EditJobPage() {
  const { id = '' } = useParams();
  const { data: job, isPending, isError, error, refetch } = useJob(id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit job" description={job?.title} />
      {isPending ? (
        <LoadingState label="Loading job" />
      ) : isError ? (
        <QueryError error={error} onRetry={() => void refetch()} />
      ) : (
        <JobForm key={job.updatedAt} job={job} />
      )}
    </div>
  );
}
