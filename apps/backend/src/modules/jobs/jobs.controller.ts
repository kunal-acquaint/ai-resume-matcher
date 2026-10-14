import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Job, Paginated, User } from '@resume-matcher/shared';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CreateJobDto, ListJobsQueryDto, UpdateJobDto } from './dto/job-request.dto.js';
import { JobResponseDto, PaginatedJobsResponseDto } from './dto/job-response.dto.js';
import { JobsService } from './jobs.service.js';

@ApiTags('jobs')
@ApiCookieAuth()
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  @ApiOkResponse({ type: PaginatedJobsResponseDto })
  list(@Query() query: ListJobsQueryDto): Promise<Paginated<Job>> {
    return this.jobs.list(query);
  }

  @Post()
  @ApiCreatedResponse({
    type: JobResponseDto,
    description:
      'Job created; skill extraction runs in the background (skillsStatus "extracting").',
  })
  create(@Body() dto: CreateJobDto, @CurrentUser() user: User): Promise<Job> {
    return this.jobs.create(dto, user.id);
  }

  @Get(':id')
  @ApiOkResponse({ type: JobResponseDto })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseObjectIdPipe) id: string): Promise<Job> {
    return this.jobs.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: JobResponseDto })
  @ApiNotFoundResponse()
  @ApiConflictResponse({
    description: 'Description or skills changed while extraction is running.',
  })
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateJobDto): Promise<Job> {
    return this.jobs.update(id, dto);
  }

  @Post(':id/extract-skills')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse({ type: JobResponseDto, description: 'Extraction queued.' })
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'Extraction already in progress.' })
  extractSkills(@Param('id', ParseObjectIdPipe) id: string): Promise<Job> {
    return this.jobs.requestSkillExtraction(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Job and all its candidates deleted.' })
  @ApiNotFoundResponse()
  remove(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.jobs.remove(id);
  }
}
