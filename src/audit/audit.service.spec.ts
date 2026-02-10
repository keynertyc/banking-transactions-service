import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service.js';
import { AuditLogRepository } from './repositories/audit-log.repository.js';
import { AuditAction, AuditLog } from './entities/audit-log.entity.js';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogRepository: jest.Mocked<AuditLogRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: AuditLogRepository,
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findByEntityId: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuditService);
    auditLogRepository = module.get(AuditLogRepository);
  });

  it('log – creates and saves audit entry', async () => {
    // Arrange
    const entry = {
      id: 'audit-1',
      action: AuditAction.ACCOUNT_CREATED,
      entityId: 'uuid-1',
      entityType: 'Account',
    } as AuditLog;
    auditLogRepository.create.mockReturnValue(entry);
    auditLogRepository.save.mockResolvedValue(entry);

    // Act
    const result = await service.log(
      AuditAction.ACCOUNT_CREATED,
      'uuid-1',
      'Account',
      null,
      { accountNumber: 'ACC-001' },
    );

    // Assert
    expect(auditLogRepository.create).toHaveBeenCalledWith({
      action: AuditAction.ACCOUNT_CREATED,
      entityId: 'uuid-1',
      entityType: 'Account',
      oldValues: null,
      newValues: { accountNumber: 'ACC-001' },
    });
    expect(auditLogRepository.save).toHaveBeenCalledWith(entry);
    expect(result).toEqual(entry);
  });

  it('findByEntityId – delegates to repository', async () => {
    // Arrange
    const logs = [{ id: 'audit-1' } as AuditLog];
    auditLogRepository.findByEntityId.mockResolvedValue(logs);

    // Act
    const result = await service.findByEntityId('uuid-1');

    // Assert
    expect(auditLogRepository.findByEntityId).toHaveBeenCalledWith('uuid-1');
    expect(result).toEqual(logs);
  });
});
