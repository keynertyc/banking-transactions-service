import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { TransactionService } from './transaction.service.js';
import { TransactionRepository } from './repositories/transaction.repository.js';
import { AccountService } from '../accounts/account.service.js';
import { AuditService } from '../audit/audit.service.js';
import { TransactionType } from './enums/transaction-type.enum.js';
import { TransactionStatus } from './enums/transaction-status.enum.js';
import { AuditAction } from '../audit/entities/audit-log.entity.js';
import { Transaction } from './entities/transaction.entity.js';

describe('TransactionService', () => {
  let service: TransactionService;
  let transactionRepository: jest.Mocked<TransactionRepository>;
  let accountService: jest.Mocked<AccountService>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: TransactionRepository,
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findById: jest.fn(),
            findByReferenceId: jest.fn(),
            findByAccountId: jest.fn(),
          },
        },
        {
          provide: AccountService,
          useValue: {
            updateBalance: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get(TransactionService);
    transactionRepository = module.get(TransactionRepository);
    accountService = module.get(AccountService);
    auditService = module.get(AuditService);
  });

  it('processTransaction deposit – creates PENDING, calls updateBalance with income, marks COMPLETED', async () => {
    // Arrange
    const dto = {
      accountId: 'acc-1',
      type: TransactionType.DEPOSIT,
      amount: 100,
      description: 'Deposit',
      referenceId: undefined,
    };
    const pendingTx = {
      id: 'tx-1',
      status: TransactionStatus.PENDING,
    } as Transaction;
    const completedTx = {
      ...pendingTx,
      status: TransactionStatus.COMPLETED,
    } as Transaction;
    transactionRepository.create.mockReturnValue(pendingTx);
    transactionRepository.save
      .mockResolvedValueOnce(pendingTx)
      .mockResolvedValueOnce(completedTx);
    accountService.updateBalance.mockResolvedValue({} as any);

    // Act
    const result = await service.processTransaction(dto);

    // Assert
    expect(transactionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: TransactionStatus.PENDING }),
    );
    expect(accountService.updateBalance).toHaveBeenCalledWith('acc-1', 100, 'income');
    expect(transactionRepository.save).toHaveBeenCalledTimes(2);
    expect(auditService.log).toHaveBeenCalledWith(
      AuditAction.TRANSACTION_PROCESSED,
      'tx-1',
      'Transaction',
      null,
      expect.objectContaining({ accountId: 'acc-1', type: TransactionType.DEPOSIT, amount: 100 }),
    );
    expect(result).toEqual(completedTx);
  });

  it('processTransaction withdrawal – calls updateBalance with expense', async () => {
    // Arrange
    const dto = {
      accountId: 'acc-1',
      type: TransactionType.WITHDRAWAL,
      amount: 50,
      description: 'Withdrawal',
    };
    const pendingTx = { id: 'tx-2', status: TransactionStatus.PENDING } as Transaction;
    const completedTx = { ...pendingTx, status: TransactionStatus.COMPLETED } as Transaction;
    transactionRepository.create.mockReturnValue(pendingTx);
    transactionRepository.save
      .mockResolvedValueOnce(pendingTx)
      .mockResolvedValueOnce(completedTx);
    accountService.updateBalance.mockResolvedValue({} as any);

    // Act
    await service.processTransaction(dto);

    // Assert
    expect(accountService.updateBalance).toHaveBeenCalledWith('acc-1', 50, 'expense');
  });

  it('processTransaction failed – marks FAILED, calls audit.log with TRANSACTION_FAILED, rethrows', async () => {
    // Arrange
    const dto = {
      accountId: 'acc-1',
      type: TransactionType.DEPOSIT,
      amount: 100,
      description: 'Deposit',
    };
    const pendingTx = { id: 'tx-3', status: TransactionStatus.PENDING } as Transaction;
    transactionRepository.create.mockReturnValue(pendingTx);
    transactionRepository.save.mockResolvedValue(pendingTx);
    const error = new Error('Balance update failed');
    accountService.updateBalance.mockRejectedValue(error);

    // Act & Assert
    await expect(service.processTransaction(dto)).rejects.toThrow('Balance update failed');
    expect(transactionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: TransactionStatus.FAILED }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      AuditAction.TRANSACTION_FAILED,
      'tx-3',
      'Transaction',
      null,
      expect.objectContaining({ error: 'Balance update failed' }),
    );
  });

  it('processTransaction idempotency – throws ConflictException when referenceId exists', async () => {
    // Arrange
    const dto = {
      accountId: 'acc-1',
      type: TransactionType.DEPOSIT,
      amount: 100,
      description: 'Deposit',
      referenceId: 'ref-1',
    };
    transactionRepository.findByReferenceId.mockResolvedValue({ id: 'tx-existing' } as Transaction);

    // Act & Assert
    await expect(service.processTransaction(dto)).rejects.toThrow(ConflictException);
  });

  it('processTransfer – calls processTransaction twice and returns outgoing and incoming', async () => {
    // Arrange
    const dto = {
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      amount: 100,
      description: 'Transfer',
    };
    const outgoingTx = { id: 'tx-out' } as Transaction;
    const incomingTx = { id: 'tx-in' } as Transaction;

    const pendingOut = { id: 'tx-out', status: TransactionStatus.PENDING } as Transaction;
    const completedOut = { ...pendingOut, status: TransactionStatus.COMPLETED } as Transaction;
    const pendingIn = { id: 'tx-in', status: TransactionStatus.PENDING } as Transaction;
    const completedIn = { ...pendingIn, status: TransactionStatus.COMPLETED } as Transaction;

    transactionRepository.create
      .mockReturnValueOnce(pendingOut)
      .mockReturnValueOnce(pendingIn);
    transactionRepository.save
      .mockResolvedValueOnce(pendingOut)
      .mockResolvedValueOnce(completedOut)
      .mockResolvedValueOnce(pendingIn)
      .mockResolvedValueOnce(completedIn);
    accountService.updateBalance.mockResolvedValue({} as any);
    transactionRepository.findByReferenceId.mockResolvedValue(null);

    // Act
    const result = await service.processTransfer(dto);

    // Assert
    expect(result).toEqual({ outgoing: completedOut, incoming: completedIn });
    expect(accountService.updateBalance).toHaveBeenCalledTimes(2);
  });

  it('findByAccountId – delegates with filter', async () => {
    // Arrange
    const filter = { page: 1, limit: 20, skip: 0 };
    const paginatedResult = {
      data: [{ id: 'tx-1' } as Transaction],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    transactionRepository.findByAccountId.mockResolvedValue(paginatedResult);

    // Act
    const result = await service.findByAccountId('acc-1', filter);

    // Assert
    expect(transactionRepository.findByAccountId).toHaveBeenCalledWith('acc-1', filter);
    expect(result).toEqual(paginatedResult);
  });

  it('findById – delegates to repository', async () => {
    // Arrange
    const transaction = { id: 'tx-1' } as Transaction;
    transactionRepository.findById.mockResolvedValue(transaction);

    // Act
    const result = await service.findById('tx-1');

    // Assert
    expect(transactionRepository.findById).toHaveBeenCalledWith('tx-1');
    expect(result).toEqual(transaction);
  });
});
