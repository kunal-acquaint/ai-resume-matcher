import type { JobStatus, SkillsStatus } from '@resume-matcher/shared';
import type { ReactElement } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return status === 'active' ? (
    <Badge tone="success">Active</Badge>
  ) : (
    <Badge tone="neutral">Closed</Badge>
  );
}

const SKILLS_BADGES = {
  extracting: (
    <Badge tone="brand">
      <Spinner className="size-3" label="Extracting skills" />
      Extracting skills
    </Badge>
  ),
  failed: <Badge tone="danger">Skills needed</Badge>,
  ready: <Badge tone="success">Skills ready</Badge>,
} satisfies Record<SkillsStatus, ReactElement>;

export function SkillsStatusBadge({ status }: { status: SkillsStatus }) {
  return SKILLS_BADGES[status];
}
