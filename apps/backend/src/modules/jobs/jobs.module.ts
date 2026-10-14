import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '../ai/ai.module.js';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';
import { Job, JobSchema } from './schemas/job.schema.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]), AiModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
