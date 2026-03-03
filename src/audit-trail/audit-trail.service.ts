import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditTrails } from 'src/database/entities/audit-trails.entity';
import { Repository } from 'typeorm';
import { AuditLogs } from './interfaces/audit-trails-interface';
import { SelectQueryBuilder } from 'typeorm/browser';
import { AuditLogQueryDto } from './dto/audit-logs.dto';
import { AuditActCodes, LogType } from 'utils/enums/general-enums';

@Injectable()
export class AuditTrailService {
  constructor(
    @InjectRepository(AuditTrails)
    private readonly auditRepository: Repository<AuditTrails>,
  ) {}

  async createLog(auditLogs: AuditLogs) {
    const logs = this.auditRepository.create({
      ...auditLogs,
    });
    await this.auditRepository.save(logs);
  }

  async getAllLogs(auditLogDto: AuditLogQueryDto) {
    const { page = 1, limit = 10, ...filters } = auditLogDto;

    if (filters.type === LogType.MIXED) {
      return this.getMixedLogs(page, limit);
    }

    const query = this.auditRepository
      .createQueryBuilder('log')
      .innerJoin('log.user', 'user');
    const filteredQuery = this.applyFilters(query, filters);
    filteredQuery.select([
      'log.id',
      'log.actCode',
      'log.action',
      'log.comment',
      'user.name',
      'log.createdAt',
    ]);
    filteredQuery.skip((page - 1) * limit).take(limit);
    filteredQuery.orderBy('log.createdAt', 'DESC');
    const [data, total] = await filteredQuery.getManyAndCount();
    const lastPage = Math.ceil(total / limit);
    return { data, total, page, lastPage, limit };
  }

  private async getMixedLogs(page: number, limit: number) {
    const normalLogs = await this.auditRepository
      .createQueryBuilder('log')
      .innerJoin('log.user', 'user')
      .select('log.id', 'id')
      .addSelect('log.actCode', 'actCode')
      .addSelect('log.action', 'action')
      .addSelect('log.comment', 'comment')
      .addSelect('user.name', 'name')
      .addSelect('log.createdAt', 'createdAt')
      .where('log.actCode != :code', { code: AuditActCodes.STUDENT_ENROLL })
      .orderBy('log.createdAt', 'DESC')
      .getRawMany();

    const enrollBatches = await this.auditRepository
      .createQueryBuilder('log')
      .innerJoin('log.user', 'user')
      .select('DATE(log.createdAt)', 'date')
      .addSelect('COUNT(log.id)', 'count')
      .addSelect('MAX(log.id)', 'id')
      .addSelect('MAX(log.createdAt)', 'createdAt')
      .addSelect('MIN(log.userId)', 'minUserId')
      .addSelect('MAX(log.userId)', 'maxUserId')
      .addSelect('MAX(user.name)', 'name')
      .where('log.actCode = :code', { code: AuditActCodes.STUDENT_ENROLL })
      .groupBy('DATE(log.createdAt)')
      .orderBy('date', 'DESC')
      .getRawMany();

    const enrollFormatted = enrollBatches.map((batch) => ({
      id: batch.id,
      actCode: AuditActCodes.STUDENT_ENROLL,
      action: `${batch.count} student(s) enrolled`,
      comment: `New batch of students added to the system`,
      name: batch.minUserId === batch.maxUserId ? batch.name : null,
      createdAt: batch.createdAt,
      isBatch: true,
      count: Number(batch.count),
    }));

    const merged = [...normalLogs, ...enrollFormatted].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const total = merged.length;
    const lastPage = Math.ceil(total / limit);
    const data = merged.slice((page - 1) * limit, page * limit);

    return { data, total, page, lastPage, limit };
  }

  private applyFilters(
    query: SelectQueryBuilder<AuditTrails>,
    filters: Partial<AuditLogQueryDto>,
  ): SelectQueryBuilder<AuditTrails> {
    if (filters.type) {
      switch (filters.type) {
        case LogType.RESULT_PUBLISH:
          query.andWhere('log.actCode = :code', {
            code: AuditActCodes.RESULT_PUBLISH,
          });
          break;

        case LogType.STUDENT_PROMOTION:
          query.andWhere('log.actCode = :code', {
            code: AuditActCodes.STUDENT_PROMOTION,
          });
          break;

        case LogType.MIXED:
        default:
          break;
      }
    }
    if (filters.dateFrom && filters.dateTo) {
      query.andWhere('log.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: new Date(filters.dateFrom),
        dateTo: new Date(filters.dateTo),
      });
    }

    return query;
  }
}
