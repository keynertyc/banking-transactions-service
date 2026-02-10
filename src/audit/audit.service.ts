import { Injectable, Logger } from '@nestjs/common';
import { AuditLogRepository } from './repositories/audit-log.repository.js';
import { AuditAction, AuditLog } from './entities/audit-log.entity.js';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async log(
    action: AuditAction,
    entityId: string,
    entityType: string,
    oldValues?: Record<string, unknown> | null,
    newValues?: Record<string, unknown> | null,
  ): Promise<AuditLog> {
    this.logger.log(`Audit: ${action} on ${entityType} ${entityId}`);
    const entry = this.auditLogRepository.create({
      action,
      entityId,
      entityType,
      oldValues: oldValues ?? null,
      newValues: newValues ?? null,
    });
    return this.auditLogRepository.save(entry);
  }

  findByEntityId(entityId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.findByEntityId(entityId);
  }
}
