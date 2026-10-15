import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import type { DashboardStats } from '@resume-matcher/shared';
import { DashboardService } from './dashboard.service.js';

class DashboardStatsDto implements DashboardStats {
  @ApiProperty()
  activeJobs: number;

  @ApiProperty()
  totalResumes: number;

  @ApiProperty({ description: 'Uploaded in the last 7 days.' })
  resumesThisWeek: number;

  @ApiProperty({ type: Number, nullable: true, minimum: 0, maximum: 1 })
  averageScore: number | null;
}

@ApiTags('dashboard')
@ApiCookieAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('stats')
  @ApiOkResponse({ type: DashboardStatsDto })
  stats(): Promise<DashboardStats> {
    return this.dashboard.getStats();
  }
}
