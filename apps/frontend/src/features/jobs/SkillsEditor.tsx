import { JOB_LIMITS, type Job } from '@resume-matcher/shared';
import { Pencil, Plus, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { getErrorMessage } from '@/lib/api/api-error';
import { useExtractSkills, useUpdateJob } from './job-queries';
import { type DraftSkill, toDraft, validateDraft } from './skills-draft';

/** Required skills of a job: shows extraction progress, lets the admin review and edit the list. */
export function SkillsEditor({ job }: { job: Job }) {
  const [draft, setDraft] = useState<DraftSkill[] | null>(null);
  const [draftError, setDraftError] = useState<string>();
  const [confirmReExtract, setConfirmReExtract] = useState(false);
  const updateJob = useUpdateJob(job.id);
  const extractSkills = useExtractSkills(job.id);
  const extracting = job.skillsStatus === 'extracting';

  const startEditing = () => {
    setDraftError(undefined);
    setDraft(
      job.requiredSkills.length > 0
        ? job.requiredSkills.map((skill) => toDraft(skill.name, skill.aliases))
        : [toDraft()],
    );
  };

  const updateRow = (key: number, changes: Partial<DraftSkill>) => {
    setDraft(
      (rows) => rows?.map((row) => (row.key === key ? { ...row, ...changes } : row)) ?? null,
    );
  };

  const save = () => {
    if (!draft) return;
    const result = validateDraft(draft);
    if (typeof result === 'string') {
      setDraftError(result);
      return;
    }
    setDraftError(undefined);
    updateJob.mutate(
      { requiredSkills: result },
      {
        onSuccess: () => {
          toast.success('Skills saved. Candidate scores were recalculated.');
          setDraft(null);
        },
        onError: (error) => setDraftError(getErrorMessage(error)),
      },
    );
  };

  const reExtract = () => {
    extractSkills.mutate(undefined, {
      onSuccess: () => {
        setConfirmReExtract(false);
        setDraft(null);
        toast.success('Extracting required skills…');
      },
      onError: (error) => {
        setConfirmReExtract(false);
        toast.error(getErrorMessage(error));
      },
    });
  };

  const actions = draft ? undefined : (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setConfirmReExtract(true)}
        disabled={extracting}
      >
        <RefreshCw aria-hidden="true" className="size-4" />
        Re-extract with AI
      </Button>
      <Button variant="secondary" size="sm" onClick={startEditing} disabled={extracting}>
        <Pencil aria-hidden="true" className="size-4" />
        Edit skills
      </Button>
    </>
  );

  return (
    <Card
      title="Required skills"
      description="Each resume is checked for these skills (or their aliases)."
      actions={actions}
    >
      {draft ? (
        <div className="space-y-3">
          {draftError && <Alert>{draftError}</Alert>}
          <ul className="space-y-2">
            {draft.map((row, index) => (
              <li key={row.key} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  aria-label={`Skill ${index + 1} name`}
                  placeholder="Skill, e.g. Node.js"
                  value={row.name}
                  maxLength={JOB_LIMITS.skillNameMaxLength}
                  onChange={(event) => updateRow(row.key, { name: event.target.value })}
                  className="sm:w-56"
                />
                <Input
                  aria-label={`Skill ${index + 1} aliases`}
                  placeholder="Aliases, comma-separated (e.g. NodeJS, Node)"
                  value={row.aliases}
                  onChange={(event) => updateRow(row.key, { aliases: event.target.value })}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${row.name.trim() || `skill ${index + 1}`}`}
                  onClick={() => setDraft((rows) => rows?.filter((r) => r.key !== row.key) ?? null)}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDraft((rows) => [...(rows ?? []), toDraft()])}
              disabled={draft.length >= JOB_LIMITS.maxSkills}
            >
              <Plus aria-hidden="true" className="size-4" />
              Add skill
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDraft(null)}
                disabled={updateJob.isPending}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={save} loading={updateJob.isPending}>
                Save skills
              </Button>
            </div>
          </div>
        </div>
      ) : extracting ? (
        <div className="flex items-start gap-3 rounded-lg bg-brand-50 p-4 text-sm text-brand-700">
          <Spinner className="mt-0.5 size-4" label="Extracting skills" />
          <p>
            Extracting the required skills from the job description. This can take about a minute;
            the page updates automatically.
          </p>
        </div>
      ) : job.skillsStatus === 'failed' ? (
        <div className="space-y-3">
          <Alert>
            No skills could be extracted from the description. Retry the extraction, or add the
            skills yourself. Resumes can be matched once the job has skills.
          </Alert>
          <div className="flex gap-2">
            <Button size="sm" onClick={reExtract} loading={extractSkills.isPending}>
              <Sparkles aria-hidden="true" className="size-4" />
              Retry extraction
            </Button>
            <Button variant="secondary" size="sm" onClick={startEditing}>
              Add skills manually
            </Button>
          </div>
        </div>
      ) : (
        <ul aria-label="Required skills" className="flex flex-wrap gap-2">
          {job.requiredSkills.map((skill) => (
            <li
              key={skill.name}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm"
            >
              <span className="font-medium text-slate-800">{skill.name}</span>
              {skill.aliases.length > 0 && (
                <span className="text-xs text-slate-500">({skill.aliases.join(', ')})</span>
              )}
              {skill.source === 'manual' && <Badge className="ml-0.5">manual</Badge>}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmReExtract}
        title="Re-extract skills with AI?"
        confirmLabel="Re-extract"
        loading={extractSkills.isPending}
        onConfirm={reExtract}
        onCancel={() => setConfirmReExtract(false)}
      >
        The current skill list, including your manual edits, will be replaced by skills extracted
        from the job description. Candidate scores are recalculated when it finishes.
      </ConfirmDialog>
    </Card>
  );
}
