import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { TransactionRepository } from './repositories/transaction.repository.js';
import { Transaction } from './entities/transaction.entity.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { CreateTransferDto } from './dto/create-transfer.dto.js';
import { TransactionFilterDto } from './dto/transaction-filter.dto.js';
import { TransactionType } from './enums/transaction-type.enum.js';
import { TransactionStatus } from './enums/transaction-status.enum.js';
import { AccountService } from '../accounts/account.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../audit/entities/audit-log.entity.js';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface.js';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly accountService: AccountService,
    private readonly auditService: AuditService,
  ) {}

  async processTransaction(dto: CreateTransactionDto): Promise<Transaction> {
    if (dto.referenceId) {
      const existing = await this.transactionRepository.findByReferenceId(
        dto.referenceId,
      );
      if (existing) {
        this.logger.warn(
          `Duplicate transaction with referenceId ${dto.referenceId}`,
        );
        throw new ConflictException(
          `Transaction with referenceId ${dto.referenceId} already exists`,
        );
      }
    }

    this.logger.log(
      `Processing ${dto.type} of ${dto.amount} for account ${dto.accountId}`,
    );

    const transaction = this.transactionRepository.create({
      accountId: dto.accountId,
      type: dto.type,
      amount: String(dto.amount),
      description: dto.description,
      referenceId: dto.referenceId ?? null,
      metadata: dto.metadata ?? null,
      status: TransactionStatus.PENDING,
    });

    const savedTransaction =
      await this.transactionRepository.save(transaction);

    try {
      const balanceType = this.getBalanceType(dto.type);

      await this.accountService.updateBalance(
        dto.accountId,
        dto.amount,
        balanceType,
      );

      savedTransaction.status = TransactionStatus.COMPLETED;
      const completed =
        await this.transactionRepository.save(savedTransaction);

      await this.auditService.log(
        AuditAction.TRANSACTION_PROCESSED,
        completed.id,
        'Transaction',
        null,
        { accountId: dto.accountId, type: dto.type, amount: dto.amount },
      );

      this.logger.log(`Transaction ${completed.id} completed`);
      return completed;
    } catch (error) {
      savedTransaction.status = TransactionStatus.FAILED;
      await this.transactionRepository.save(savedTransaction);

      await this.auditService.log(
        AuditAction.TRANSACTION_FAILED,
        savedTransaction.id,
        'Transaction',
        null,
        {
          accountId: dto.accountId,
          type: dto.type,
          amount: dto.amount,
          error: error instanceof Error ? error.message : String(error),
        },
      );

      this.logger.error(
        `Transaction ${savedTransaction.id} failed: ${error}`,
      );
      throw error;
    }
  }

  async processTransfer(dto: CreateTransferDto): Promise<{
    outgoing: Transaction;
    incoming: Transaction;
  }> {
    this.logger.log(
      `Processing transfer of ${dto.amount} from ${dto.fromAccountId} to ${dto.toAccountId}`,
    );

    const outgoing = await this.processTransaction({
      accountId: dto.fromAccountId,
      type: TransactionType.TRANSFER_OUT,
      amount: dto.amount,
      description: dto.description,
      referenceId: dto.referenceId
        ? `${dto.referenceId}-out`
        : undefined,
      metadata: {
        ...dto.metadata,
        targetAccountId: dto.toAccountId,
      },
    });

    try {
      const incoming = await this.processTransaction({
        accountId: dto.toAccountId,
        type: TransactionType.TRANSFER_IN,
        amount: dto.amount,
        description: dto.description,
        referenceId: dto.referenceId
          ? `${dto.referenceId}-in`
          : undefined,
        metadata: {
          ...dto.metadata,
          sourceAccountId: dto.fromAccountId,
        },
      });

      return { outgoing, incoming };
    } catch (error) {
      this.logger.error(
        `Transfer failed on incoming side, reversing outgoing transaction`,
      );
      await this.processTransaction({
        accountId: dto.fromAccountId,
        type: TransactionType.DEPOSIT,
        amount: dto.amount,
        description: `Reversal: ${dto.description}`,
        metadata: { reversedTransactionId: outgoing.id },
      });
      throw error;
    }
  }

  async findByAccountId(
    accountId: string,
    filter: TransactionFilterDto,
  ): Promise<PaginatedResult<Transaction>> {
    return this.transactionRepository.findByAccountId(accountId, filter);
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.transactionRepository.findById(id);
  }

  private getBalanceType(type: TransactionType): 'income' | 'expense' {
    return type === TransactionType.DEPOSIT ||
      type === TransactionType.TRANSFER_IN
      ? 'income'
      : 'expense';
  }
}
