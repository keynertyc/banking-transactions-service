import 'reflect-metadata';
import { validate } from './env.validation.js';

describe('validate (env)', () => {
  it('should return validated config with defaults', () => {
    // Arrange
    const config = {};

    // Act
    const result = validate(config);

    // Assert
    expect(result.PORT).toBe(3000);
    expect(result.DB_HOST).toBe('localhost');
    expect(result.DB_PORT).toBe(5432);
    expect(result.DB_USERNAME).toBe('postgres');
    expect(result.KAFKA_BROKER).toBe('localhost:9092');
  });

  it('should use provided values', () => {
    // Arrange
    const config = {
      NODE_ENV: 'production',
      PORT: '8080',
      DB_HOST: 'db-prod',
      DB_PORT: '5433',
      DB_USERNAME: 'admin',
      DB_PASSWORD: 'secret',
      DB_NAME: 'prod_db',
      KAFKA_BROKER: 'kafka:9093',
    };

    // Act
    const result = validate(config);

    // Assert
    expect(result.PORT).toBe(8080);
    expect(result.DB_HOST).toBe('db-prod');
    expect(result.KAFKA_BROKER).toBe('kafka:9093');
  });
});
