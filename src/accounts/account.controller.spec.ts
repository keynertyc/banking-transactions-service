import { Test, TestingModule } from '@nestjs/testing';
import { AccountController } from './account.controller.js';
import { AccountService } from './account.service.js';
import { Account } from './entities/account.entity.js';

describe('AccountController', () => {
  let controller: AccountController;
  let service: jest.Mocked<AccountService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [
        {
          provide: AccountService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            softDelete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(AccountController);
    service = module.get(AccountService);
  });

  it('create – delegates to service', async () => {
    // Arrange
    const dto = { accountNumber: 'ACC-001', ownerName: 'John' };
    const account = { id: 'uuid-1', ...dto } as Account;
    service.create.mockResolvedValue(account);

    // Act
    const result = await controller.create(dto);

    // Assert
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(account);
  });

  it('findAll – passes PaginationDto to service', async () => {
    // Arrange
    const pagination = { page: 1, limit: 20, skip: 0 };
    const paginatedResult = {
      data: [{ id: 'uuid-1' } as Account],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    service.findAll.mockResolvedValue(paginatedResult);

    // Act
    const result = await controller.findAll(pagination);

    // Assert
    expect(service.findAll).toHaveBeenCalledWith(pagination);
    expect(result).toEqual(paginatedResult);
  });

  it('findOne – delegates to service with id', async () => {
    // Arrange
    const account = { id: 'uuid-1' } as Account;
    service.findById.mockResolvedValue(account);

    // Act
    const result = await controller.findOne('uuid-1');

    // Assert
    expect(service.findById).toHaveBeenCalledWith('uuid-1');
    expect(result).toEqual(account);
  });

  it('remove – delegates to softDelete', async () => {
    // Arrange
    service.softDelete.mockResolvedValue(undefined);

    // Act
    await controller.remove('uuid-1');

    // Assert
    expect(service.softDelete).toHaveBeenCalledWith('uuid-1');
  });
});
