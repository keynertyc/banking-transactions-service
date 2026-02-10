import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccountService } from './account.service.js';
import { AccountRepository } from './repositories/account.repository.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../audit/entities/audit-log.entity.js';
import { Account } from './entities/account.entity.js';

describe('AccountService', () => {
  let service: AccountService;
  let accountRepository: jest.Mocked<AccountRepository>;
  let auditService: jest.Mocked<AuditService>;
  let mockQueryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    manager: { save: jest.Mock; findOne: jest.Mock };
  };

  beforeEach(async () => {
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn(),
        findOne: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        {
          provide: AccountRepository,
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findById: jest.fn(),
            findByAccountNumber: jest.fn(),
            findAll: jest.fn(),
            softDelete: jest.fn(),
            findByIdWithLock: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn().mockResolvedValue({}),
            findByEntityId: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
          },
        },
      ],
    }).compile();

    service = module.get(AccountService);
    accountRepository = module.get(AccountRepository);
    auditService = module.get(AuditService);
  });

  it('create – creates and saves account, calls auditService.log', async () => {
    // Arrange
    const dto = { accountNumber: 'ACC-001', ownerName: 'John' };
    const account = { id: 'uuid-1', ...dto } as Account;
    accountRepository.create.mockReturnValue(account);
    accountRepository.save.mockResolvedValue(account);

    // Act
    const result = await service.create(dto);

    // Assert
    expect(accountRepository.create).toHaveBeenCalledWith(dto);
    expect(accountRepository.save).toHaveBeenCalledWith(account);
    expect(auditService.log).toHaveBeenCalledWith(
      AuditAction.ACCOUNT_CREATED,
      'uuid-1',
      'Account',
      null,
      { accountNumber: 'ACC-001', ownerName: 'John' },
    );
    expect(result).toEqual(account);
  });

  it('findById – returns account when found', async () => {
    // Arrange
    const account = { id: 'uuid-1' } as Account;
    accountRepository.findById.mockResolvedValue(account);

    // Act
    const result = await service.findById('uuid-1');

    // Assert
    expect(result).toEqual(account);
  });

  it('findById – throws NotFoundException when not found', async () => {
    // Arrange
    accountRepository.findById.mockResolvedValue(null);

    // Act & Assert
    await expect(service.findById('uuid-1')).rejects.toThrow(NotFoundException);
  });

  it('findByAccountNumber – returns account when found', async () => {
    // Arrange
    const account = { id: 'uuid-1', accountNumber: 'ACC-001' } as Account;
    accountRepository.findByAccountNumber.mockResolvedValue(account);

    // Act
    const result = await service.findByAccountNumber('ACC-001');

    // Assert
    expect(result).toEqual(account);
  });

  it('findByAccountNumber – throws NotFoundException when not found', async () => {
    // Arrange
    accountRepository.findByAccountNumber.mockResolvedValue(null);

    // Act & Assert
    await expect(service.findByAccountNumber('ACC-001')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('findAll – returns paginated accounts', async () => {
    // Arrange
    const pagination = { page: 1, limit: 20, skip: 0 };
    const paginatedResult = {
      data: [{ id: 'uuid-1' } as Account],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    accountRepository.findAll.mockResolvedValue(paginatedResult);

    // Act
    const result = await service.findAll(pagination);

    // Assert
    expect(accountRepository.findAll).toHaveBeenCalledWith(pagination);
    expect(result).toEqual(paginatedResult);
  });

  it('softDelete – calls findById then softDelete, then auditService.log', async () => {
    // Arrange
    const account = { id: 'uuid-1' } as Account;
    accountRepository.findById.mockResolvedValue(account);
    accountRepository.softDelete.mockResolvedValue(undefined);

    // Act
    await service.softDelete('uuid-1');

    // Assert
    expect(accountRepository.findById).toHaveBeenCalledWith('uuid-1');
    expect(accountRepository.softDelete).toHaveBeenCalledWith('uuid-1');
    expect(auditService.log).toHaveBeenCalledWith(
      AuditAction.ACCOUNT_DELETED,
      'uuid-1',
      'Account',
    );
  });

  it('updateBalance income – updates balance and totalIncome, commits transaction', async () => {
    // Arrange
    const account = {
      id: 'uuid-1',
      balance: '100.00',
      totalIncome: '50.00',
      totalExpenses: '0.00',
    } as Account;
    accountRepository.findByIdWithLock.mockResolvedValue(account);
    const savedAccount = { ...account, balance: '200.00', totalIncome: '150.00' } as Account;
    mockQueryRunner.manager.save.mockResolvedValue(savedAccount);

    // Act
    const result = await service.updateBalance('uuid-1', 100, 'income');

    // Assert
    expect(mockQueryRunner.connect).toHaveBeenCalled();
    expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
    expect(accountRepository.findByIdWithLock).toHaveBeenCalledWith('uuid-1', mockQueryRunner);
    expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(account);
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.release).toHaveBeenCalled();
    expect(result).toEqual(savedAccount);
  });

  it('updateBalance expense – subtracts from balance, adds to totalExpenses', async () => {
    // Arrange
    const account = {
      id: 'uuid-1',
      balance: '200.00',
      totalIncome: '0.00',
      totalExpenses: '10.00',
    } as Account;
    accountRepository.findByIdWithLock.mockResolvedValue(account);
    const savedAccount = { ...account, balance: '150.00', totalExpenses: '60.00' } as Account;
    mockQueryRunner.manager.save.mockResolvedValue(savedAccount);

    // Act
    const result = await service.updateBalance('uuid-1', 50, 'expense');

    // Assert
    expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(account);
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    expect(result).toEqual(savedAccount);
  });

  it('updateBalance insufficient funds – throws BadRequestException, rolls back', async () => {
    // Arrange
    const account = {
      id: 'uuid-1',
      balance: '10.00',
      totalIncome: '0.00',
      totalExpenses: '0.00',
    } as Account;
    accountRepository.findByIdWithLock.mockResolvedValue(account);

    // Act & Assert
    await expect(service.updateBalance('uuid-1', 100, 'expense')).rejects.toThrow(
      BadRequestException,
    );
    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.release).toHaveBeenCalled();
  });
});
