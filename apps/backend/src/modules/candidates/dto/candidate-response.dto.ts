import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  Candidate,
  CandidateSummary,
  MatchedSkill,
  Paginated,
  SkillEvidence,
  SkillMatch,
} from '@resume-matcher/shared';

/** Swagger documentation for the candidate response shapes. */
class EntityRefDto {
  @ApiProperty()
  id: string;
}

class JobRefDto extends EntityRefDto {
  @ApiProperty()
  title: string;
}

class UserRefDto extends EntityRefDto {
  @ApiProperty()
  name: string;
}

export class MatchedSkillDto implements MatchedSkill {
  @ApiProperty({ example: 'React' })
  skill: string;

  @ApiProperty({ enum: ['text', 'alias', 'semantic'] })
  evidence: SkillEvidence;

  @ApiPropertyOptional({ example: 'React.js', description: 'Term found (text/alias evidence).' })
  term?: string;

  @ApiPropertyOptional({ description: 'Similarity of the best passage (semantic evidence).' })
  similarity?: number;

  @ApiPropertyOptional({ description: 'Matching resume passage (semantic evidence).' })
  passage?: string;
}

export class SkillMatchDto implements SkillMatch {
  @ApiProperty({ type: [MatchedSkillDto] })
  matched: MatchedSkillDto[];

  @ApiProperty({ type: [String], example: ['GraphQL'] })
  missing: string[];
}

export class CandidateSummaryDto implements CandidateSummary {
  @ApiProperty()
  id: string;

  @ApiProperty()
  candidateName: string;

  @ApiProperty({ type: String, nullable: true })
  candidateEmail: string | null;

  @ApiProperty({ type: JobRefDto, nullable: true })
  job: JobRefDto | null;

  @ApiProperty()
  fileName: string;

  @ApiProperty({ minimum: 0, maximum: 1, description: 'Hybrid score (spec §5.3).' })
  finalScore: number;

  @ApiProperty({ minimum: 0, maximum: 1 })
  semanticScore: number;

  @ApiProperty({ minimum: 0, maximum: 1, description: 'Share of required skills matched.' })
  coverage: number;

  @ApiProperty()
  matchedSkillCount: number;

  @ApiProperty()
  requiredSkillCount: number;

  @ApiProperty({ type: UserRefDto, nullable: true, description: 'Null if the admin was removed.' })
  uploadedBy: UserRefDto | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;
}

export class CandidateDto extends CandidateSummaryDto implements Candidate {
  @ApiProperty({ type: SkillMatchDto })
  skillMatch: SkillMatchDto;
}

export class PaginatedCandidatesDto implements Paginated<CandidateSummary> {
  @ApiProperty({ type: [CandidateSummaryDto] })
  items: CandidateSummaryDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}
