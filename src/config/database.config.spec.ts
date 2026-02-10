import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DatabaseConfig } from './database.config.js';

describe('DatabaseConfig', () => {
  let databaseConfig: DatabaseConfig;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseConfig,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    databaseConfig = module.get(DatabaseConfig);
    configService = module.get(ConfigService);
  });

  it('createTypeOrmOptions – returns correct config using ConfigService.get calls', () => {
    // Arrange
    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      const values: Record<string, any> = {
        DB_HOST: 'db-host',
        DB_PORT: 5433,
        DB_USERNAME: 'admin',
        DB_PASSWORD: 'secret',
        DB_NAME: 'testdb',
        NODE_ENV: 'development',
      };
      return values[key] ?? defaultValue;
    });

    // Act
    const options = databaseConfig.createTypeOrmOptions();

    // Assert
    expect(options).toEqual({
      type: 'postgres',
      host: 'db-host',
      port: 5433,
      username: 'admin',
      password: 'secret',
      database: 'testdb',
      autoLoadEntities: true,
      synchronize: true,
    });
  });
});
