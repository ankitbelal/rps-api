import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditTrails } from 'src/database/entities/audit-trails.entity';
import { Repository } from 'typeorm';
import { AuditLogs } from './interfaces/audit-trails-interface';
import { UserService } from 'src/user/user.service';
import { SelectQueryBuilder } from 'typeorm/browser';
import { AuditLogQueryDto } from './dto/audit-logs.dto';

@Injectable()
export class AuditTrailService {
  constructor(
    @InjectRepository(AuditTrails)
    private readonly auditRepository: Repository<AuditTrails>,
    private readonly userService: UserService,
  ) {}

  async createLog(auditLogs: AuditLogs) {
    const logs = this.auditRepository.create({
      ...auditLogs,
    });
    await this.auditRepository.save(logs);
  }

  async getAllLogs(auditLogDto: AuditLogQueryDto) {
    const { page = 1, limit = 10, ...filters } = auditLogDto;

    const query = this.auditRepository
      .createQueryBuilder('log')
      .innerJoin('log.user', 'user');
    const filteredquery = this.applyFilters(query, filters);
    filteredquery.select(['id', 'actCode', 'action']);
    filteredquery.skip((page - 1) * limit).take(limit);
    filteredquery.orderBy('log.createdAt', 'DESC');
    const [data, total] = await filteredquery.getManyAndCount();
    const lastPage = Math.ceil(total / limit);
    return { data, total, page, lastPage, limit };
  }

  private applyFilters(
    query: SelectQueryBuilder<AuditTrails>,
    filters: Partial<AuditLogQueryDto>,
  ): SelectQueryBuilder<AuditTrails> {
    return query;
  }
}
