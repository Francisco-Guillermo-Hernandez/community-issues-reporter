import { handler } from './main';
import { ReportFactory } from '~/database/factories/report.factory';
import { ReportPictureFactory } from '~/database/factories/reportPicture.factory';
import { DatabaseConnection } from '~/database/dataSource';
import { StorageService } from '~/services/storage.service';
import type { APIGatewayProxyEventV2 } from '@aws-lambda-powertools/parser/types';
import type { Context } from 'aws-lambda';
import { ZodError } from 'zod';

// Mock the database connection
jest.mock('~/database/dataSource');

// Mock the factories
jest.mock('~/database/factories/report.factory');
jest.mock('~/database/factories/reportPicture.factory');

// Mock the storage service
jest.mock('~/services/storage.service');

describe('Detach Pictures from Report Lambda', () => {
  let mockReportService: any;
  let mockReportPictureService: any;
  let mockStorageService: any;
  let mockEvent: APIGatewayProxyEventV2;
  let mockContext: Context;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock services
    mockReportService = {
      getReportById: jest.fn(),
    };

    mockReportPictureService = {
      getPictureById: jest.fn(),
      detach: jest.fn(),
    };

    mockStorageService = {
      deleteFileFromS3: jest.fn(),
    };

    // Mock factory returns
    (ReportFactory.createReportService as jest.Mock).mockReturnValue(mockReportService);
    (ReportPictureFactory.createService as jest.Mock).mockReturnValue(mockReportPictureService);
    (StorageService as jest.Mock).mockImplementation(() => mockStorageService);

    // Mock database connection
    (DatabaseConnection.initialize as jest.Mock).mockResolvedValue(undefined);

    // Mock event
    mockEvent = {
      body: JSON.stringify({
        pictureId: 'picture-123',
        reportId: 'report-456',
      }),
      headers: {},
      isBase64Encoded: false,
      requestContext: {} as any,
      routeKey: 'DELETE /reports/detach-pictures',
      version: '2.0',
    };

    mockContext = {} as Context;
  });

  describe('Successful picture detachment', () => {
    it('should successfully detach a picture from a report', async () => {
      // Arrange
      const mockReport = {
        id: 'report-456',
        description: 'Test report',
      };

      const mockPicture = {
        id: 'picture-123',
        key: 's3-key-123',
        reportId: 'report-456',
        validated: false,
      };

      const mockDetachResult = {
        affected: 1,
      };

      mockReportService.getReportById.mockResolvedValue(mockReport);
      mockReportPictureService.getPictureById.mockResolvedValue(mockPicture);
      mockReportPictureService.detach.mockResolvedValue(mockDetachResult);
      mockStorageService.deleteFileFromS3.mockResolvedValue(undefined);

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body!)).toEqual({
        message: 'Picture successfully detached from report',
        result: { deletedRecords: 1 },
      });

      expect(mockReportService.getReportById).toHaveBeenCalledWith('report-456');
      expect(mockReportPictureService.getPictureById).toHaveBeenCalledWith('picture-123');
      expect(mockReportPictureService.detach).toHaveBeenCalledWith({
        pictureId: 'picture-123',
        reportId: 'report-456',
        validated: false,
        validatedByUsers: false,
      });
      expect(mockStorageService.deleteFileFromS3).toHaveBeenCalledWith('s3-key-123');
    });

    it('should handle case when no records are affected', async () => {
      // Arrange
      const mockReport = { id: 'report-456' };
      const mockPicture = {
        id: 'picture-123',
        key: 's3-key-123',
        reportId: 'report-456',
        validated: false,
      };
      const mockDetachResult = { affected: 0 };

      mockReportService.getReportById.mockResolvedValue(mockReport);
      mockReportPictureService.getPictureById.mockResolvedValue(mockPicture);
      mockReportPictureService.detach.mockResolvedValue(mockDetachResult);

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body!)).toEqual({
        message: 'Picture successfully detached from report',
        result: { deletedRecords: 0 },
      });

      expect(mockStorageService.deleteFileFromS3).not.toHaveBeenCalled();
    });
  });

  describe('Validation errors', () => {
    it('should return 400 when request body validation fails', async () => {
      // Arrange
      mockEvent.body = JSON.stringify({
        pictureId: '', // Invalid: empty pictureId
        reportId: 'report-456',
      });

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Bad Request',
        cause: 'Validation error',
      });
    });

    it('should return 400 when request body is malformed JSON', async () => {
      // Arrange
      mockEvent.body = 'invalid json';

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Bad Request',
        cause: 'Validation error',
      });
    });
  });

  describe('Not found errors', () => {
    it('should return 404 when report does not exist', async () => {
      // Arrange
      mockReportService.getReportById.mockResolvedValue(null);

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Not Found',
        cause: 'Report not found',
      });

      expect(mockReportService.getReportById).toHaveBeenCalledWith('report-456');
      expect(mockReportPictureService.getPictureById).not.toHaveBeenCalled();
    });

    it('should return 404 when picture does not exist', async () => {
      // Arrange
      const mockReport = { id: 'report-456' };
      mockReportService.getReportById.mockResolvedValue(mockReport);
      mockReportPictureService.getPictureById.mockResolvedValue(null);

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Not Found',
        cause: 'Picture not found',
      });

      expect(mockReportPictureService.getPictureById).toHaveBeenCalledWith('picture-123');
      expect(mockReportPictureService.detach).not.toHaveBeenCalled();
    });
  });

  describe('Business logic errors', () => {
    it('should return 400 when picture does not belong to the specified report', async () => {
      // Arrange
      const mockReport = { id: 'report-456' };
      const mockPicture = {
        id: 'picture-123',
        key: 's3-key-123',
        reportId: 'different-report-id', // Different report ID
        validated: false,
      };

      mockReportService.getReportById.mockResolvedValue(mockReport);
      mockReportPictureService.getPictureById.mockResolvedValue(mockPicture);

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Bad Request',
        cause: 'Picture does not belong to the specified report',
      });

      expect(mockReportPictureService.detach).not.toHaveBeenCalled();
    });

    it('should return 400 when trying to delete a validated picture', async () => {
      // Arrange
      const mockReport = { id: 'report-456' };
      const mockPicture = {
        id: 'picture-123',
        key: 's3-key-123',
        reportId: 'report-456',
        validated: true, // Picture is validated
      };

      mockReportService.getReportById.mockResolvedValue(mockReport);
      mockReportPictureService.getPictureById.mockResolvedValue(mockPicture);

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Cannot delete validated picture',
        cause: 'Policy does not allow deletion of validated pictures',
      });

      expect(mockReportPictureService.detach).not.toHaveBeenCalled();
    });
  });

  describe('Service failures', () => {
    it('should return 500 when report service fails', async () => {
      // Arrange
      mockReportService.getReportById.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Internal Server Error',
        cause: 'Failed to detach picture from report',
      });
    });

    it('should return 500 when detach operation fails', async () => {
      // Arrange
      const mockReport = { id: 'report-456' };
      const mockPicture = {
        id: 'picture-123',
        key: 's3-key-123',
        reportId: 'report-456',
        validated: false,
      };

      mockReportService.getReportById.mockResolvedValue(mockReport);
      mockReportPictureService.getPictureById.mockResolvedValue(mockPicture);
      mockReportPictureService.detach.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Internal Server Error',
        cause: 'Failed to detach picture from report',
      });
    });

    it('should return 500 when S3 deletion fails but continue with success response', async () => {
      // Arrange
      const mockReport = { id: 'report-456' };
      const mockPicture = {
        id: 'picture-123',
        key: 's3-key-123',
        reportId: 'report-456',
        validated: false,
      };
      const mockDetachResult = { affected: 1 };

      mockReportService.getReportById.mockResolvedValue(mockReport);
      mockReportPictureService.getPictureById.mockResolvedValue(mockPicture);
      mockReportPictureService.detach.mockResolvedValue(mockDetachResult);
      mockStorageService.deleteFileFromS3.mockRejectedValue(new Error('S3 deletion failed'));

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Internal Server Error',
        cause: 'Failed to detach picture from report',
      });
    });
  });
});