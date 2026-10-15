import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface.js';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  CANDIDATE_LIMITS,
  type Candidate,
  type CandidateSummary,
  type Paginated,
  type User,
} from '@resume-matcher/shared';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CandidatesService, type UploadedResume } from './candidates.service.js';
import { ListCandidatesQueryDto, UploadCandidateDto } from './dto/candidate-request.dto.js';
import { CandidateDto, PaginatedCandidatesDto } from './dto/candidate-response.dto.js';

/** In-memory upload (Multer's default) of exactly one PDF up to 5 MB. */
const RESUME_UPLOAD: MulterOptions = {
  limits: { fileSize: CANDIDATE_LIMITS.maxFileSize, files: 1, fields: 5, fieldSize: 1024 },
  fileFilter: (_request, file: { mimetype: string; originalname: string }, accept) => {
    const looksLikePdf =
      file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    // The file's real content is verified later by PdfTextExtractor.
    accept(
      looksLikePdf ? null : new BadRequestException('Only PDF files are allowed'),
      looksLikePdf,
    );
  },
};

@ApiTags('candidates')
@ApiCookieAuth()
@Controller()
export class CandidatesController {
  constructor(private readonly candidates: CandidatesService) {}

  @Post('jobs/:jobId/candidates')
  @UseInterceptors(FileInterceptor('file', RESUME_UPLOAD))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'candidateName'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'One PDF resume, max 5 MB.' },
        candidateName: { type: 'string', maxLength: CANDIDATE_LIMITS.nameMaxLength },
        candidateEmail: { type: 'string', format: 'email' },
      },
    },
  })
  @ApiCreatedResponse({ type: CandidateDto, description: 'Resume scored and stored.' })
  @ApiBadRequestResponse({ description: 'Missing, non-PDF or unreadable file; invalid fields.' })
  @ApiPayloadTooLargeResponse({ description: 'File larger than 5 MB.' })
  @ApiUnprocessableEntityResponse({ description: 'PDF has no text layer (scanned).' })
  @ApiConflictResponse({ description: 'Duplicate resume, closed job, or skills not ready.' })
  @ApiNotFoundResponse({ description: 'Job not found.' })
  upload(
    @Param('jobId', ParseObjectIdPipe) jobId: string,
    @UploadedFile() file: UploadedResume | undefined,
    @Body() fields: UploadCandidateDto,
    @CurrentUser() user: User,
  ): Promise<Candidate> {
    if (!file) {
      throw new BadRequestException('A PDF file is required (form field "file")');
    }
    return this.candidates.upload(jobId, file, fields, user.id);
  }

  @Get('candidates')
  @ApiOkResponse({ type: PaginatedCandidatesDto })
  list(@Query() query: ListCandidatesQueryDto): Promise<Paginated<CandidateSummary>> {
    return this.candidates.list(query);
  }

  @Get('candidates/:id')
  @ApiOkResponse({ type: CandidateDto })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseObjectIdPipe) id: string): Promise<Candidate> {
    return this.candidates.findOne(id);
  }

  @Delete('candidates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.candidates.remove(id);
  }
}
