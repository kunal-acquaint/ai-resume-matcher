import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CANDIDATE_LIMITS,
  CANDIDATE_SORTS,
  type CandidateSort,
  type ListCandidatesQuery,
  type UploadCandidateFields,
} from '@resume-matcher/shared';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsMongoId, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { trim } from '../../../common/dto/transforms.js';

/** Multipart forms send empty optional fields as ""; treat those as absent. */
const emptyToUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : trim({ value });

export class UploadCandidateDto implements UploadCandidateFields {
  @ApiProperty({ example: 'Jane Doe', maxLength: CANDIDATE_LIMITS.nameMaxLength })
  @Transform(trim)
  @IsString()
  @Length(1, CANDIDATE_LIMITS.nameMaxLength)
  candidateName: string;

  @ApiPropertyOptional({ example: 'jane@example.com' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEmail()
  @MaxLength(254)
  candidateEmail?: string;
}

export class ListCandidatesQueryDto extends PaginationQueryDto implements ListCandidatesQuery {
  @ApiPropertyOptional({ description: 'Only candidates of this job.' })
  @IsOptional()
  @IsMongoId()
  jobId?: string;

  @ApiPropertyOptional({ description: 'Case-insensitive search in the candidate name.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: CANDIDATE_SORTS, default: 'date' })
  @IsOptional()
  @IsIn(CANDIDATE_SORTS)
  sort: CandidateSort = 'date';
}
