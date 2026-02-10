import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity.js';
import { TransactionRepository } from './repositories/transaction.repository.js';
import { TransactionService } from './transaction.service.js';
import { TransactionController } from './transaction.controller.js';
import { AccountModule } from '../accounts/account.module.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    AccountModule,
    AuditModule,
  ],
  controllers: [TransactionController],
  providers: [TransactionService, TransactionRepository],
  exports: [TransactionService],
})
export class TransactionModule {}
