import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  JOB_LIMITS,
  JOB_STATUSES,
  type CreateJobRequest,
  type JobStatus,
  type ListJobsQuery,
  type RequiredSkillInput,
  type UpdateJobRequest,
} from '@resume-matcher/shared';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { trim } from '../../../common/dto/transforms.js';

const IsJobTitle = (): PropertyDecorator =>
  applyDecorators(Transform(trim), IsString(), Length(1, JOB_LIMITS.titleMaxLength));

const IsJobDescription = (): PropertyDecorator =>
  applyDecorators(
    Transform(trim),
    IsString(),
    Length(JOB_LIMITS.descriptionMinLength, JOB_LIMITS.descriptionMaxLength),
  );

export class CreateJobDto implements CreateJobRequest {
  @ApiProperty({ example: 'Senior Full-Stack Developer', maxLength: JOB_LIMITS.titleMaxLength })
  @IsJobTitle()
  title: string;

  @ApiProperty({
    minLength: JOB_LIMITS.descriptionMinLength,
    maxLength: JOB_LIMITS.descriptionMaxLength,
  })
  @IsJobDescription()
  description: string;
}

export class RequiredSkillInputDto implements RequiredSkillInput {
  @ApiProperty({ example: 'Node.js', maxLength: JOB_LIMITS.skillNameMaxLength })
  @Transform(trim)
  @IsString()
  @Length(1, JOB_LIMITS.skillNameMaxLength)
  name: string;

  @ApiPropertyOptional({ type: [String], example: ['NodeJS'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(JOB_LIMITS.maxAliasesPerSkill)
  @IsString({ each: true })
  @Length(1, JOB_LIMITS.skillNameMaxLength, { each: true })
  aliases?: string[];
}

export class UpdateJobDto implements UpdateJobRequest {
  @ApiPropertyOptional({ maxLength: JOB_LIMITS.titleMaxLength })
  @IsOptional()
  @IsJobTitle()
  title?: string;

  @ApiPropertyOptional({
    minLength: JOB_LIMITS.descriptionMinLength,
    maxLength: JOB_LIMITS.descriptionMaxLength,
  })
  @IsOptional()
  @IsJobDescription()
  description?: string;

  @ApiPropertyOptional({ enum: JOB_STATUSES })
  @IsOptional()
  @IsIn(JOB_STATUSES)
  status?: JobStatus;

  @ApiPropertyOptional({ type: [RequiredSkillInputDto], description: 'Replaces the whole list.' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(JOB_LIMITS.maxSkills)
  @ValidateNested({ each: true })
  @Type(() => RequiredSkillInputDto)
  requiredSkills?: RequiredSkillInputDto[];
}

export class ListJobsQueryDto extends PaginationQueryDto implements ListJobsQuery {
  @ApiPropertyOptional({ enum: JOB_STATUSES })
  @IsOptional()
  @IsIn(JOB_STATUSES)
  status?: JobStatus;

  @ApiPropertyOptional({ description: 'Case-insensitive search in the title.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;
}
