import { ApiProperty } from '@nestjs/swagger';
import {
  JOB_STATUSES,
  SKILLS_STATUSES,
  type Job,
  type JobStatus,
  type Paginated,
  type RequiredSkill,
  type SkillsStatus,
} from '@resume-matcher/shared';

/** Swagger documentation for the job response shapes. */
export class RequiredSkillResponseDto implements RequiredSkill {
  @ApiProperty({ example: 'Node.js' })
  name: string;

  @ApiProperty({ type: [String], example: ['NodeJS', 'Node'] })
  aliases: string[];

  @ApiProperty({ enum: ['ai', 'manual'] })
  source: 'ai' | 'manual';
}

class JobCreatorDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class JobResponseDto implements Job {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: JOB_STATUSES })
  status: JobStatus;

  @ApiProperty({ type: [RequiredSkillResponseDto] })
  requiredSkills: RequiredSkillResponseDto[];

  @ApiProperty({ enum: SKILLS_STATUSES })
  skillsStatus: SkillsStatus;

  @ApiProperty()
  candidateCount: number;

  @ApiProperty({
    type: JobCreatorDto,
    nullable: true,
    description: 'Null if the admin was removed.',
  })
  createdBy: JobCreatorDto | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;
}

export class PaginatedJobsResponseDto implements Paginated<Job> {
  @ApiProperty({ type: [JobResponseDto] })
  items: JobResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}
