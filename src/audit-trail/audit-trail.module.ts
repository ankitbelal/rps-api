import { Module } from '@nestjs/common';
import { AuditTrailController } from './audit-trail.controller';
import { AuditTrailService } from './audit-trail.service';
import { UserModule } from 'src/user/user.module';

@Module({
  controllers: [AuditTrailController],
  providers: [AuditTrailService],
  exports: [AuditTrailService],
  imports: [UserModule],
})
export class AuditTrailModule {}
