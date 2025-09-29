import { handler } from './main';
import { ReportFactory } from '~/database/factories/report.factory';
import { ReportPictureFactory } from '~/database/factories/reportPicture.factory';
import { DatabaseConnection } from '~/database/dataSource';
import { StorageService } from '~/services/storage.service';
import type { APIGatewayProxyEventV2 } from '@aws-lambda-powertools/parser/types';
import type { Context, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { ZodError } from 'zod';

// Mock the database connection
jest.mock('~/database/dataSource');

// Mock the factories
jest.mock('~/database/factories/report.factory');
jest.mock('~/database/factories/reportPicture.factory');

// Mock the storage service
jest.mock('~/services/storage.service');

// Mock utility functions
jest.mock('~/common/utils', () => ({
  ...jest.requireActual('~/common/utils'),
  checkBodySize: jest.fn(),
  multipartFormDataParser: jest.fn(),
}));

describe('Create Reports Lambda', () => {
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
      saveReport: jest.fn(),
    };

    mockReportPictureService = {
      attach: jest.fn(),
    };

    mockStorageService = {
      mapFileKeys: jest.fn(),
      uploadMultipleFiles: jest.fn(),
    };

    // Mock factory returns
    (ReportFactory.createReportService as jest.Mock).mockReturnValue(mockReportService);
    (ReportPictureFactory.createService as jest.Mock).mockReturnValue(mockReportPictureService);
    (StorageService as jest.Mock).mockImplementation(() => mockStorageService);

    // Mock database connection
    (DatabaseConnection.initialize as jest.Mock).mockResolvedValue(undefined);

    // Mock event
    mockEvent = {
      body: 'multipart-form-data-content',
      headers: {
        'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
        mode: 'full',
      },
      isBase64Encoded: false,
      requestContext: {} as any,
      routeKey: 'POST /reports',
      version: '2.0',
    };

    mockContext = {} as Context;

    // Mock utility functions
    const { checkBodySize, multipartFormDataParser } = require('~/common/utils');
    checkBodySize.mockImplementation(() => {});
    multipartFormDataParser.mockReturnValue({
      files: [
        { fieldname: 'image1', originalname: 'test1.jpg', buffer: Buffer.from('test') },
        { fieldname: 'image2', originalname: 'test2.jpg', buffer: Buffer.from('test') },
      ],
      formData: {
        coordinate: '[40.7128, -74.0060]',
        address: '123 Test Street',
        description: 'Test pothole report',
        severity: 'medium',
        status: 'reported',
        issueType: 'potholes',
        reportedAt: '2023-01-01T00:00:00Z',
        cellIndex: 'A1',
      },
    });
  });

  describe('Successful report creation', () => {
    it('should successfully create a report in full mode with pictures', async () => {
      // Arrange
      const mockSavedReport = { id: 'report-123' };
      const mockFileKeys = [
        { key: 'key1', fileName: 'test1.jpg', hash: 'hash1' },
        { key: 'key2', fileName: 'test2.jpg', hash: 'hash2' },
      ];
      const mockAttachResult = {
        identifiers: [{ id: 'pic1' }, { id: 'pic2' }],
      };

      mockReportService.saveReport.mockResolvedValue(mockSavedReport);
      mockStorageService.mapFileKeys.mockReturnValue(mockFileKeys);
      mockReportPictureService.attach.mockResolvedValue(mockAttachResult);
      mockStorageService.uploadMultipleFiles.mockResolvedValue(undefined);

      // Act
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body!)).toEqual({
        data: {
          message: 'Your report was created successfully',
          reportId: 'report-123',
          result: [{ id: 'pic1' }, { id: 'pic2' }],
        },
      });

      expect(mockReportService.saveReport).toHaveBeenCalledWith({
        coordinate: [40.7128, -74.0060],
        address: '123 Test Street',
        description: 'Test pothole report',
        cellIndex: 'A1',
        reportedAt: new Date('2023-01-01T00:00:00Z'),
        reportedById: 'e1903638-462f-4c03-8176-7bae51986e43',
        issueTypeId: expect.any(Number),
        statusId: expect.any(Number),
        severityId: expect.any(Number),
      });

      expect(mockStorageService.mapFileKeys).toHaveBeenCalled();
      expect(mockReportPictureService.attach).toHaveBeenCalled();
      expect(mockStorageService.uploadMultipleFiles).toHaveBeenCalled();
    });

    it('should successfully create a report without full mode (no file processing)', async () => {
      // Arrange
      mockEvent.headers.mode = 'basic';
      const mockSavedReport = { id: 'report-456' };

      mockReportService.saveReport.mockResolvedValue(mockSavedReport);

      // Act
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body!)).toEqual({
        data: {
          message: 'Your report was created successfully',
          reportId: 'report-456',
          result: undefined,
        },
      });

      expect(mockReportService.saveReport).toHaveBeenCalled();
      expect(mockStorageService.mapFileKeys).not.toHaveBeenCalled();
      expect(mockReportPictureService.attach).not.toHaveBeenCalled();
      expect(mockStorageService.uploadMultipleFiles).not.toHaveBeenCalled();
    });
  });

  describe('Validation errors', () => {
    it('should return 400 when mode header is missing', async () => {
      // Arrange
      delete mockEvent.headers.mode;

      // Act
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Bad Request',
        cause: "mode header isn't available",
      });
    });

    it('should return 400 when form data validation fails', async () => {
      // Arrange
      const { multipartFormDataParser } = require('~/common/utils');
      multipartFormDataParser.mockReturnValue({
        files: [],
        formData: {
          // Missing required fields
          coordinate: 'invalid-coordinate',
        },
      });

      // Act
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Bad Request',
        cause: 'Parser error',
      });
    });

    it('should return 413 when payload is too large', async () => {
      // Arrange
      const { checkBodySize } = require('~/common/utils');
      checkBodySize.mockImplementation(() => {
        throw new Error('Payload too large');
      });

      // Act
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(413);
    });
  });

  describe('Error handling', () => {
    it('should return 500 when report service fails', async () => {
      // Arrange
      mockReportService.saveReport.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Internal Server Error',
        cause: 'Failed to create',
      });
    });

    it('should return 500 when storage service fails', async () => {
      // Arrange
      const mockSavedReport = { id: 'report-123' };
      const mockFileKeys = [{ key: 'key1', fileName: 'test1.jpg', hash: 'hash1' }];

      mockReportService.saveReport.mockResolvedValue(mockSavedReport);
      mockStorageService.mapFileKeys.mockReturnValue(mockFileKeys);
      mockReportPictureService.attach.mockResolvedValue({ identifiers: [] });
      mockStorageService.uploadMultipleFiles.mockRejectedValue(new Error('S3 upload failed'));

      // Act
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Internal Server Error',
        cause: 'Failed to create',
      });
    });

    it('should return 500 when unexpected error occurs', async () => {
      // Arrange
      const { multipartFormDataParser } = require('~/common/utils');
      multipartFormDataParser.mockImplementation(() => {
        throw new Error('Unexpected parsing error');
      });

      // Act
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Internal Server Error',
        cause: 'Failed to create',
      });
    });
  });
});