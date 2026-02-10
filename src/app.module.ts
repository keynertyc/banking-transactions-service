import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { validate } from './config/env.validation.js';
import { DatabaseConfig } from './config/database.config.js';
import { KafkaConfig } from './config/kafka.config.js';
import { AccountModule } from './accounts/account.module.js';
import { TransactionModule } from './transactions/transaction.module.js';
import { AuditModule } from './audit/audit.module.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfig,
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AccountModule,
    TransactionModule,
    AuditModule,
    HealthModule,
  ],
  providers: [
    KafkaConfig,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [KafkaConfig],
})
export class AppModule {}
