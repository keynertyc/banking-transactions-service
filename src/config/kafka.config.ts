import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KafkaOptions, Transport } from '@nestjs/microservices';

@Injectable()
export class KafkaConfig {
  constructor(private readonly configService: ConfigService) {}

  createKafkaOptions(): KafkaOptions {
    return {
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: 'banking-service',
          brokers: [this.configService.get<string>('KAFKA_BROKER', 'localhost:9092')],
        },
        consumer: {
          groupId: 'banking-consumer-group',
        },
      },
    };
  }
}
