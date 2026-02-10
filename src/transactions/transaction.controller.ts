import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  Logger,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TransactionService } from './transaction.service.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { CreateTransferDto } from './dto/create-transfer.dto.js';
import { TransactionFilterDto } from './dto/transaction-filter.dto.js';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionController {
  private readonly logger = new Logger(TransactionController.name);

  constructor(private readonly transactionService: TransactionService) {}

  @MessagePattern('banking.transactions')
  async handleTransaction(@Payload() data: CreateTransactionDto) {
    this.logger.log(`Received transaction from Kafka: ${JSON.stringify(data)}`);
    return this.transactionService.processTransaction(data);
  }

  @Post()
  @ApiOperation({ summary: 'Create a transaction' })
  create(@Body() dto: CreateTransactionDto) {
    return this.transactionService.processTransaction(dto);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer between accounts' })
  transfer(@Body() dto: CreateTransferDto) {
    return this.transactionService.processTransfer(dto);
  }

  @Get('account/:accountId')
  @ApiOperation({ summary: 'List transactions by account (paginated, filterable)' })
  findByAccount(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query() filter: TransactionFilterDto,
  ) {
    return this.transactionService.findByAccountId(accountId, filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.transactionService.findById(id);
  }
}
