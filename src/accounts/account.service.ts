import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccountRepository } from './repositories/account.repository.js';
import { Account } from './entities/account.entity.js';
import { CreateAccountDto } from './dto/create-account.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../audit/entities/audit-log.entity.js';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateAccountDto): Promise<Account> {
    const account = this.accountRepository.create(dto);
    const saved = await this.accountRepository.save(account);

    await this.auditService.log(
      AuditAction.ACCOUNT_CREATED,
      saved.id,
      'Account',
      null,
      { accountNumber: saved.accountNumber, ownerName: saved.ownerName },
    );

    return saved;
  }

  async findById(id: string): Promise<Account> {
    const account = await this.accountRepository.findById(id);
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }
    return account;
  }

  async findByAccountNumber(accountNumber: string): Promise<Account> {
    const account =
      await this.accountRepository.findByAccountNumber(accountNumber);
    if (!account) {
      throw new NotFoundException(
        `Account with number ${accountNumber} not found`,
      );
    }
    return account;
  }

  async findAll(pagination: PaginationDto): Promise<PaginatedResult<Account>> {
    return this.accountRepository.findAll(pagination);
  }

  async softDelete(id: string): Promise<void> {
    await this.findById(id);
    await this.accountRepository.softDelete(id);

    await this.auditService.log(
      AuditAction.ACCOUNT_DELETED,
      id,
      'Account',
    );
  }

  async updateBalance(
    accountId: string,
    amount: number,
    type: 'income' | 'expense',
  ): Promise<Account> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const account = await this.accountRepository.findByIdWithLock(
        accountId,
        queryRunner,
      );
      if (!account) {
        throw new NotFoundException(`Account with ID ${accountId} not found`);
      }

      const oldBalance = account.balance;
      const currentBalance = parseFloat(account.balance);

      if (type === 'expense') {
        if (currentBalance < amount) {
          throw new BadRequestException('Insufficient funds');
        }
        account.balance = (currentBalance - amount).toFixed(2);
        account.totalExpenses = (
          parseFloat(account.totalExpenses) + amount
        ).toFixed(2);
      } else {
        account.balance = (currentBalance + amount).toFixed(2);
        account.totalIncome = (
          parseFloat(account.totalIncome) + amount
        ).toFixed(2);
      }

      const saved = await queryRunner.manager.save(account);
      await queryRunner.commitTransaction();

      this.logger.log(
        `Balance updated for account ${accountId}: ${oldBalance} -> ${saved.balance}`,
      );

      await this.auditService.log(
        AuditAction.BALANCE_UPDATED,
        accountId,
        'Account',
        { balance: oldBalance },
        { balance: saved.balance, type, amount },
      );

      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
