import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum AuditAction {
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',
  TRANSACTION_PROCESSED = 'TRANSACTION_PROCESSED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  BALANCE_UPDATED = 'BALANCE_UPDATED',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ type: 'uuid' })
  entityId: string;

  @Column()
  entityType: string;

  @Column({ type: 'jsonb', nullable: true })
  oldValues: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  newValues: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
