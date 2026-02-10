import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogRepository } from './audit-log.repository.js';
import { AuditLog } from '../entities/audit-log.entity.js';

describe('AuditLogRepository', () => {
  let auditLogRepository: AuditLogRepository;
  let repository: jest.Mocked<Repository<AuditLog>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogRepository,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    auditLogRepository = module.get(AuditLogRepository);
    repository = module.get(getRepositoryToken(AuditLog));
  });

  it('create – delegates', () => {
    // Arrange
    const data = { entityId: 'uuid-1' };
    const entry = { id: 'audit-1', ...data } as unknown as AuditLog;
    repository.create.mockReturnValue(entry);

    // Act
    const result = auditLogRepository.create(data);

    // Assert
    expect(repository.create).toHaveBeenCalledWith(data);
    expect(result).toEqual(entry);
  });

  it('save – delegates', async () => {
    // Arrange
    const entry = { id: 'audit-1' } as AuditLog;
    repository.save.mockResolvedValue(entry);

    // Act
    const result = await auditLogRepository.save(entry);

    // Assert
    expect(repository.save).toHaveBeenCalledWith(entry);
    expect(result).toEqual(entry);
  });

  it('findByEntityId – calls find with where and order', async () => {
    // Arrange
    const logs = [{ id: 'audit-1' } as AuditLog];
    repository.find.mockResolvedValue(logs);

    // Act
    const result = await auditLogRepository.findByEntityId('uuid-1');

    // Assert
    expect(repository.find).toHaveBeenCalledWith({
      where: { entityId: 'uuid-1' },
      order: { createdAt: 'DESC' },
    });
    expect(result).toEqual(logs);
  });
});
