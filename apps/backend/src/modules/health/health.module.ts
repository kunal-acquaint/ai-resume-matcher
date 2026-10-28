import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AiModule } from '../ai/ai.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [TerminusModule, AiModule],
  controllers: [HealthController],
})
export class HealthModule {}
