import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity.js';
import { TransactionFilterDto } from '../dto/transaction-filter.dto.js';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';

@Injectable()
export class TransactionRepository {
  constructor(
    @InjectRepository(Transaction)
    private readonly repository: Repository<Transaction>,
  ) {}

  create(data: Partial<Transaction>): Transaction {
    return this.repository.create(data);
  }

  save(transaction: Transaction): Promise<Transaction> {
    return this.repository.save(transaction);
  }

  findById(id: string): Promise<Transaction | null> {
    return this.repository.findOneBy({ id });
  }

  findByReferenceId(referenceId: string): Promise<Transaction | null> {
    return this.repository.findOneBy({ referenceId });
  }

  async findByAccountId(
    accountId: string,
    filter: TransactionFilterDto,
  ): Promise<PaginatedResult<Transaction>> {
    const qb = this.repository
      .createQueryBuilder('tx')
      .where('tx.accountId = :accountId', { accountId });

    if (filter.type) {
      qb.andWhere('tx.type = :type', { type: filter.type });
    }
    if (filter.status) {
      qb.andWhere('tx.status = :status', { status: filter.status });
    }
    if (filter.startDate) {
      qb.andWhere('tx.createdAt >= :startDate', { startDate: filter.startDate });
    }
    if (filter.endDate) {
      qb.andWhere('tx.createdAt <= :endDate', { endDate: filter.endDate });
    }

    qb.orderBy('tx.createdAt', 'DESC')
      .skip(filter.skip)
      .take(filter.limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      total,
      page: filter.page,
      limit: filter.limit,
      totalPages: Math.ceil(total / filter.limit),
    };
  }
}
