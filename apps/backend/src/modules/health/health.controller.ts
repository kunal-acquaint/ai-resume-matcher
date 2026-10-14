import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  type HealthCheckResult,
  HealthCheckService,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../auth/decorators/public.decorator.js';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongoose: MongooseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([() => this.mongoose.pingCheck('mongodb')]);
  }
}
