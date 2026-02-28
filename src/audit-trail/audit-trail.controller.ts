import { Controller, Get, HttpCode, Query } from '@nestjs/common';
import { AuditLogQueryDto } from './dto/audit-logs.dto';
import { ApiResponse } from 'utils/api-response';
import { AuditTrailService } from './audit-trail.service';

@Controller('audit-trail')
export class AuditTrailController {
  constructor(private readonly auditLogService: AuditTrailService) {}

  @HttpCode(200)
  @Get()
  async getLogs(@Query() auditLogQueryDto: AuditLogQueryDto) {
    return ApiResponse.successData(
      await this.auditLogService.getAllLogs(auditLogQueryDto),
      'Logs fetched successfully.',
      200,
    );
  }
}
