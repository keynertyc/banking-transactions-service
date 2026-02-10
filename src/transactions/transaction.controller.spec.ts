import { Test, TestingModule } from '@nestjs/testing';
import { TransactionController } from './transaction.controller.js';
import { TransactionService } from './transaction.service.js';
import { TransactionType } from './enums/transaction-type.enum.js';
import { Transaction } from './entities/transaction.entity.js';

describe('TransactionController', () => {
  let controller: TransactionController;
  let service: jest.Mocked<TransactionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionController],
      providers: [
        {
          provide: TransactionService,
          useValue: {
            processTransaction: jest.fn(),
            processTransfer: jest.fn(),
            findByAccountId: jest.fn(),
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(TransactionController);
    service = module.get(TransactionService);
  });

  it('handleTransaction (Kafka) – delegates to processTransaction', async () => {
    // Arrange
    const dto = {
      accountId: 'acc-1',
      type: TransactionType.DEPOSIT,
      amount: 100,
      description: 'Kafka deposit',
    };
    const transaction = { id: 'tx-1' } as Transaction;
    service.processTransaction.mockResolvedValue(transaction);

    // Act
    const result = await controller.handleTransaction(dto);

    // Assert
    expect(service.processTransaction).toHaveBeenCalledWith(dto);
    expect(result).toEqual(transaction);
  });

  it('create (REST) – delegates to processTransaction', async () => {
    // Arrange
    const dto = {
      accountId: 'acc-1',
      type: TransactionType.DEPOSIT,
      amount: 50,
      description: 'REST deposit',
    };
    const transaction = { id: 'tx-2' } as Transaction;
    service.processTransaction.mockResolvedValue(transaction);

    // Act
    const result = await controller.create(dto);

    // Assert
    expect(service.processTransaction).toHaveBeenCalledWith(dto);
    expect(result).toEqual(transaction);
  });

  it('transfer – delegates to processTransfer', async () => {
    // Arrange
    const dto = {
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      amount: 100,
      description: 'Transfer',
    };
    const transferResult = {
      outgoing: { id: 'tx-out' } as Transaction,
      incoming: { id: 'tx-in' } as Transaction,
    };
    service.processTransfer.mockResolvedValue(transferResult);

    // Act
    const result = await controller.transfer(dto);

    // Assert
    expect(service.processTransfer).toHaveBeenCalledWith(dto);
    expect(result).toEqual(transferResult);
  });

  it('findByAccount – delegates with filter', async () => {
    // Arrange
    const filter = { page: 1, limit: 20, skip: 0 };
    const paginatedResult = {
      data: [{ id: 'tx-1' } as Transaction],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    service.findByAccountId.mockResolvedValue(paginatedResult);

    // Act
    const result = await controller.findByAccount('acc-1', filter);

    // Assert
    expect(service.findByAccountId).toHaveBeenCalledWith('acc-1', filter);
    expect(result).toEqual(paginatedResult);
  });

  it('findOne – delegates with id', async () => {
    // Arrange
    const transaction = { id: 'tx-1' } as Transaction;
    service.findById.mockResolvedValue(transaction);

    // Act
    const result = await controller.findOne('tx-1');

    // Assert
    expect(service.findById).toHaveBeenCalledWith('tx-1');
    expect(result).toEqual(transaction);
  });
});
