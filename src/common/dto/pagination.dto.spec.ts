import { PaginationDto } from './pagination.dto.js';

describe('PaginationDto', () => {
  it('should have default values', () => {
    // Arrange & Act
    const dto = new PaginationDto();

    // Assert
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('should calculate skip correctly', () => {
    // Arrange
    const dto = new PaginationDto();
    dto.page = 3;
    dto.limit = 10;

    // Act
    const skip = dto.skip;

    // Assert
    expect(skip).toBe(20);
  });
});
