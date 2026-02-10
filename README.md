# Banking Transactions Service

NestJS application that processes banking transactions via Kafka and REST API. Tracks user balances, income, expenses, and transaction logs using PostgreSQL.

## Architecture

```
src/
├── config/                        # Database, Kafka, env validation
├── common/
│   ├── dto/                       # PaginationDto
│   ├── filters/                   # GlobalExceptionFilter
│   └── interfaces/                # PaginatedResult<T>
├── accounts/
│   ├── dto/                       # CreateAccountDto
│   ├── entities/                  # Account (with versioning + soft delete)
│   ├── repositories/              # AccountRepository (with pessimistic locking)
│   ├── account.service.ts         # CRUD, balance updates (DB transactions)
│   ├── account.controller.ts      # REST endpoints
│   └── account.module.ts
├── transactions/
│   ├── dto/                       # CreateTransactionDto, CreateTransferDto, TransactionFilterDto
│   ├── entities/                  # Transaction (with idempotency key)
│   ├── enums/                     # TransactionType, TransactionStatus
│   ├── repositories/              # TransactionRepository (with filtering)
│   ├── transaction.service.ts     # Process, transfer, idempotency
│   ├── transaction.controller.ts  # REST + Kafka handler
│   └── transaction.module.ts
├── audit/
│   ├── entities/                  # AuditLog
│   ├── repositories/              # AuditLogRepository
│   ├── audit.service.ts           # Audit trail logging
│   └── audit.module.ts
├── health/
│   ├── health.controller.ts       # Health check (DB ping)
│   └── health.module.ts
├── app.module.ts
└── main.ts
```

## Features

- **Kafka + REST** — Dual ingestion via `banking.transactions` topic and REST API
- **DB Transactions** — Balance updates use `QueryRunner` with pessimistic locking
- **Optimistic Locking** — `@VersionColumn` on Account entity prevents lost updates
- **Idempotency** — `referenceId` on transactions prevents duplicate processing
- **Transfers** — Atomic account-to-account transfers with automatic reversal on failure
- **Soft Deletes** — Accounts are never hard-deleted
- **Audit Trail** — All mutations logged to `audit_logs` table
- **Pagination** — All list endpoints support `page` and `limit` query params
- **Filtering** — Transaction history filterable by type, status, date range
- **Rate Limiting** — 100 requests per minute per IP (configurable)
- **Health Checks** — `/health` endpoint with DB connectivity check
- **Swagger Docs** — Available at `/api/docs`
- **Global Exception Filter** — Standardized error responses
- **Env Validation** — Startup validation of environment variables

## Setup

```bash
# Start PostgreSQL and Kafka
docker compose up -d

# Install dependencies
npm install

# Run in development
npm run start:dev
```

## API Endpoints

### Accounts

| Method | Endpoint         | Description              |
|--------|------------------|--------------------------|
| POST   | `/accounts`      | Create account           |
| GET    | `/accounts`      | List accounts (paginated)|
| GET    | `/accounts/:id`  | Get account by ID        |
| DELETE | `/accounts/:id`  | Soft delete account      |

### Transactions

| Method | Endpoint                            | Description                         |
|--------|-------------------------------------|-------------------------------------|
| POST   | `/transactions`                     | Create transaction                  |
| POST   | `/transactions/transfer`            | Transfer between accounts           |
| GET    | `/transactions/:id`                 | Get transaction by ID               |
| GET    | `/transactions/account/:accountId`  | List transactions (paginated, filterable) |

### Health

| Method | Endpoint   | Description    |
|--------|------------|----------------|
| GET    | `/health`  | Health check   |

### Kafka Topic

- **Topic**: `banking.transactions` — Publish `CreateTransactionDto` payloads

## Example Requests

```bash
# Create account
curl -X POST http://localhost:3000/accounts \
  -H 'Content-Type: application/json' \
  -d '{"accountNumber": "ACC-001", "ownerName": "John Doe"}'

# Deposit
curl -X POST http://localhost:3000/transactions \
  -H 'Content-Type: application/json' \
  -d '{
    "accountId": "<uuid>",
    "type": "DEPOSIT",
    "amount": 1000.00,
    "description": "Initial deposit",
    "referenceId": "dep-001"
  }'

# Transfer
curl -X POST http://localhost:3000/transactions/transfer \
  -H 'Content-Type: application/json' \
  -d '{
    "fromAccountId": "<uuid>",
    "toAccountId": "<uuid>",
    "amount": 250.00,
    "description": "Payment",
    "referenceId": "tf-001"
  }'

# Filter transactions
curl "http://localhost:3000/transactions/account/<uuid>?type=DEPOSIT&status=COMPLETED&startDate=2025-01-01&page=1&limit=10"
```

## Environment Variables

| Variable       | Default          |
|----------------|------------------|
| `NODE_ENV`     | `development`    |
| `PORT`         | `3000`           |
| `DB_HOST`      | `localhost`      |
| `DB_PORT`      | `5432`           |
| `DB_USERNAME`  | `postgres`       |
| `DB_PASSWORD`  | `postgres`       |
| `DB_NAME`      | `banking`        |
| `KAFKA_BROKER` | `localhost:9092` |

## Author

**Keyner TYC** — [keyner.peru@gmail.com](mailto:keyner.peru@gmail.com)
