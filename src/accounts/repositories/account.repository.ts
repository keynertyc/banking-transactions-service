import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../entities/account.entity.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';

@Injectable()
export class AccountRepository {
  constructor(
    @InjectRepository(Account)
    private readonly repository: Repository<Account>,
  ) {}

  create(data: Partial<Account>): Account {
    return this.repository.create(data);
  }

  save(account: Account): Promise<Account> {
    return this.repository.save(account);
  }

  findById(id: string): Promise<Account | null> {
    return this.repository.findOneBy({ id });
  }

  findByIdWithLock(id: string, queryRunner: import('typeorm').QueryRunner): Promise<Account | null> {
    return queryRunner.manager.findOne(Account, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  findByAccountNumber(accountNumber: string): Promise<Account | null> {
    return this.repository.findOneBy({ accountNumber });
  }

  async findAll(pagination: PaginationDto): Promise<PaginatedResult<Account>> {
    const [data, total] = await this.repository.findAndCount({
      skip: pagination.skip,
      take: pagination.limit,
      order: { createdAt: 'DESC' },
    });
    return {
      data,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
