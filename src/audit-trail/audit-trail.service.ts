import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditTrails } from 'src/database/entities/audit-trails.entity';
import { Repository } from 'typeorm';
import { AuditLogs } from './interfaces/audit-trails-interface';
import { UserService } from 'src/user/user.service';

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

  // async getAllLogs(){
  // cont [] =await Promise.all([]);
  // }
}
