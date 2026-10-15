import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '../ai/ai.module.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { PdfModule } from '../pdf/pdf.module.js';
import { CandidatesController } from './candidates.controller.js';
import { CandidatesJobListener } from './candidates.listener.js';
import { CandidatesService } from './candidates.service.js';
import { MatchingService } from './matching/matching.service.js';
import { Candidate, CandidateSchema } from './schemas/candidate.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Candidate.name, schema: CandidateSchema }]),
    AiModule,
    JobsModule,
    PdfModule,
  ],
  controllers: [CandidatesController],
  providers: [CandidatesService, CandidatesJobListener, MatchingService],
})
export class CandidatesModule {}
