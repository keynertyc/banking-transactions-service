import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionRepository } from './transaction.repository.js';
import { Transaction } from '../entities/transaction.entity.js';
import { TransactionFilterDto } from '../dto/transaction-filter.dto.js';
import { TransactionType } from '../enums/transaction-type.enum.js';
import { TransactionStatus } from '../enums/transaction-status.enum.js';

describe('TransactionRepository', () => {
  let transactionRepository: TransactionRepository;
  let repository: jest.Mocked<Repository<Transaction>>;
  let mockQueryBuilder: {
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getManyAndCount: jest.Mock;
  };

  beforeEach(async () => {
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionRepository,
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOneBy: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
      ],
    }).compile();

    transactionRepository = module.get(TransactionRepository);
    repository = module.get(getRepositoryToken(Transaction));
  });

  it('create – delegates', () => {
    // Arrange
    const data = { accountId: 'acc-1', amount: '100' };
    const transaction = { id: 'tx-1', ...data } as unknown as Transaction;
    repository.create.mockReturnValue(transaction);

    // Act
    const result = transactionRepository.create(data);

    // Assert
    expect(repository.create).toHaveBeenCalledWith(data);
    expect(result).toEqual(transaction);
  });

  it('save – delegates', async () => {
    // Arrange
    const transaction = { id: 'tx-1' } as Transaction;
    repository.save.mockResolvedValue(transaction);

    // Act
    const result = await transactionRepository.save(transaction);

    // Assert
    expect(repository.save).toHaveBeenCalledWith(transaction);
    expect(result).toEqual(transaction);
  });

  it('findById – calls findOneBy with { id }', async () => {
    // Arrange
    const transaction = { id: 'tx-1' } as Transaction;
    repository.findOneBy.mockResolvedValue(transaction);

    // Act
    const result = await transactionRepository.findById('tx-1');

    // Assert
    expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'tx-1' });
    expect(result).toEqual(transaction);
  });

  it('findByReferenceId – calls findOneBy with { referenceId }', async () => {
    // Arrange
    const transaction = { id: 'tx-1', referenceId: 'ref-1' } as Transaction;
    repository.findOneBy.mockResolvedValue(transaction);

    // Act
    const result = await transactionRepository.findByReferenceId('ref-1');

    // Assert
    expect(repository.findOneBy).toHaveBeenCalledWith({ referenceId: 'ref-1' });
    expect(result).toEqual(transaction);
  });

  it('findByAccountId – builds query with filter, returns PaginatedResult', async () => {
    // Arrange
    const transactions = [{ id: 'tx-1' } as Transaction];
    mockQueryBuilder.getManyAndCount.mockResolvedValue([transactions, 1]);
    const filter = { page: 1, limit: 20, skip: 0 };

    // Act
    const result = await transactionRepository.findByAccountId('acc-1', filter);

    // Assert
    expect(repository.createQueryBuilder).toHaveBeenCalledWith('tx');
    expect(mockQueryBuilder.where).toHaveBeenCalledWith(
      'tx.accountId = :accountId',
      { accountId: 'acc-1' },
    );
    expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('tx.createdAt', 'DESC');
    expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
    expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    expect(result).toEqual({
      data: transactions,
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  });

  it('should apply all filters when provided', async () => {
    // Arrange
    const filter = new TransactionFilterDto();
    filter.type = TransactionType.DEPOSIT;
    filter.status = TransactionStatus.COMPLETED;
    filter.startDate = '2025-01-01';
    filter.endDate = '2025-12-31';

    mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

    // Act
    await transactionRepository.findByAccountId('acc-uuid-1', filter);

    // Assert
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(4);
  });
});
