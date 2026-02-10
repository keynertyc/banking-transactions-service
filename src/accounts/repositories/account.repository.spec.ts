import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountRepository } from './account.repository.js';
import { Account } from '../entities/account.entity.js';

describe('AccountRepository', () => {
  let accountRepository: AccountRepository;
  let repository: jest.Mocked<Repository<Account>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountRepository,
        {
          provide: getRepositoryToken(Account),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOneBy: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            softDelete: jest.fn(),
          },
        },
      ],
    }).compile();

    accountRepository = module.get(AccountRepository);
    repository = module.get(getRepositoryToken(Account));
  });

  it('create – delegates to repository.create', () => {
    // Arrange
    const data = { accountNumber: 'ACC-001', ownerName: 'John' };
    const account = { id: 'uuid-1', ...data } as Account;
    repository.create.mockReturnValue(account);

    // Act
    const result = accountRepository.create(data);

    // Assert
    expect(repository.create).toHaveBeenCalledWith(data);
    expect(result).toEqual(account);
  });

  it('save – delegates to repository.save', async () => {
    // Arrange
    const account = { id: 'uuid-1' } as Account;
    repository.save.mockResolvedValue(account);

    // Act
    const result = await accountRepository.save(account);

    // Assert
    expect(repository.save).toHaveBeenCalledWith(account);
    expect(result).toEqual(account);
  });

  it('findById – calls findOneBy with { id }', async () => {
    // Arrange
    const account = { id: 'uuid-1' } as Account;
    repository.findOneBy.mockResolvedValue(account);

    // Act
    const result = await accountRepository.findById('uuid-1');

    // Assert
    expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'uuid-1' });
    expect(result).toEqual(account);
  });

  it('findByAccountNumber – calls findOneBy with { accountNumber }', async () => {
    // Arrange
    const account = { id: 'uuid-1', accountNumber: 'ACC-001' } as Account;
    repository.findOneBy.mockResolvedValue(account);

    // Act
    const result = await accountRepository.findByAccountNumber('ACC-001');

    // Assert
    expect(repository.findOneBy).toHaveBeenCalledWith({ accountNumber: 'ACC-001' });
    expect(result).toEqual(account);
  });

  it('findAll – calls findAndCount, returns PaginatedResult', async () => {
    // Arrange
    const accounts = [{ id: 'uuid-1' } as Account];
    repository.findAndCount.mockResolvedValue([accounts, 1]);
    const pagination = { page: 1, limit: 20, skip: 0 };

    // Act
    const result = await accountRepository.findAll(pagination);

    // Assert
    expect(repository.findAndCount).toHaveBeenCalledWith({
      skip: 0,
      take: 20,
      order: { createdAt: 'DESC' },
    });
    expect(result).toEqual({
      data: accounts,
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  });

  it('softDelete – calls repository.softDelete', async () => {
    // Arrange
    repository.softDelete.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

    // Act
    await accountRepository.softDelete('uuid-1');

    // Assert
    expect(repository.softDelete).toHaveBeenCalledWith('uuid-1');
  });

  it('findByIdWithLock – calls queryRunner.manager.findOne with lock options', async () => {
    // Arrange
    const account = { id: 'uuid-1' } as Account;
    const mockQueryRunner = {
      manager: {
        findOne: jest.fn().mockResolvedValue(account),
      },
    };

    // Act
    const result = await accountRepository.findByIdWithLock('uuid-1', mockQueryRunner as any);

    // Assert
    expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(Account, {
      where: { id: 'uuid-1' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(result).toEqual(account);
  });
});
