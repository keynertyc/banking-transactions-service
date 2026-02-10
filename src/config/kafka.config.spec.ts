import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import { KafkaConfig } from './kafka.config.js';

describe('KafkaConfig', () => {
  let kafkaConfig: KafkaConfig;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KafkaConfig,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    kafkaConfig = module.get(KafkaConfig);
    configService = module.get(ConfigService);
  });

  it('createKafkaOptions – returns correct config', () => {
    // Arrange
    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      const values: Record<string, any> = {
        KAFKA_BROKER: 'broker:9093',
      };
      return values[key] ?? defaultValue;
    });

    // Act
    const options = kafkaConfig.createKafkaOptions();

    // Assert
    expect(options).toEqual({
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: 'banking-service',
          brokers: ['broker:9093'],
        },
        consumer: {
          groupId: 'banking-consumer-group',
        },
      },
    });
  });
});
