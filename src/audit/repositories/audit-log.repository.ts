import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity.js';

@Injectable()
export class AuditLogRepository {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repository: Repository<AuditLog>,
  ) {}

  save(auditLog: AuditLog): Promise<AuditLog> {
    return this.repository.save(auditLog);
  }

  create(data: Partial<AuditLog>): AuditLog {
    return this.repository.create(data);
  }

  findByEntityId(entityId: string): Promise<AuditLog[]> {
    return this.repository.find({
      where: { entityId },
      order: { createdAt: 'DESC' },
    });
  }
}
