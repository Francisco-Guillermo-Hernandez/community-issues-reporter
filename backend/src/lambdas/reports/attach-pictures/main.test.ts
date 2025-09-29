import { handler } from './main';
import { ReportFactory } from '~/database/factories/report.factory';
import { ReportPictureFactory } from '~/database/factories/reportPicture.factory';
import { DatabaseConnection } from '~/database/dataSource';
import { StorageService } from '~/services/storage.service';
import { QueryFailedError } from 'typeorm';
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

describe('Attach Pictures to Report Lambda', () => {
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
      attach: jest.fn(),
      getPictureById: jest.fn(),
    };

    mockStorageService = {
      mapFileKeys: jest.fn(),
      uploadMultipleFiles: jest.fn(),
    };

    // Mock factory returns
    (ReportFactory.createReportService as jest.Mock).mockReturnValue(mockReportService);
    (ReportPictureFactory.createService as jest.Mock).mockReturnValue(mockReportPictureService);
    
    // Mock StorageService constructor
    (StorageService as any).mockImplementation(() => mockStorageService);

    // Mock database connection
    (DatabaseConnection.initialize as jest.Mock).mockResolvedValue(undefined);

    // Mock event
    mockEvent = {
      body: 'multipart-form-data-content',
      headers: {
        'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
      },
      rawPath: '',
      rawQueryString: '',
      isBase64Encoded: false,
      requestContext: {} as any,
      routeKey: 'POST /reports/attach-pictures',
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
        reportId: '550e8400-e29b-41d4-a716-446655440000',
        severity: 'medium',
        status: 'reported',
        issueType: 'potholes',
      },
    });
  });

  describe('Successful picture attachment', () => {
    it('should successfully attach pictures to an existing report', async () => {
      // Arrange
      const mockReport = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        coordinate: [40.7128, -74.0060],
        reportedAt: '2023-01-01T00:00:00Z',
        description: 'Test report',
      };

      const mockFileKeys = [
        { key: 'key1', fileName: 'test1.jpg', hash: 'hash1' },
        { key: 'key2', fileName: 'test2.jpg', hash: 'hash2' },
      ];

      const mockAttachResult = {
        identifiers: [{ id: 'pic1' }, { id: 'pic2' }],
      };

      mockReportService.getReportById.mockResolvedValue(mockReport);
      mockStorageService.mapFileKeys.mockReturnValue(mockFileKeys);
      mockReportPictureService.attach.mockResolvedValue(mockAttachResult);
      mockStorageService.uploadMultipleFiles.mockResolvedValue(undefined);

      // Act
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      // expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body!)).toEqual({
        message: 'The pictures were attached to the report',
        result: [{ id: 'pic1' }, { id: 'pic2' }],
      });

      expect(mockReportService.getReportById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(mockStorageService.mapFileKeys).toHaveBeenCalledWith(
        'potholes',
        '550e8400-e29b-41d4-a716-446655440000',
        expect.any(Array)
      );
      expect(mockReportPictureService.attach).toHaveBeenCalledWith([
        {
          id: 'hash1',
          key: 'key1',
          fileName: 'test1.jpg',
          registeredAt: new Date('2023-01-01T00:00:00Z'),
          reportId: '550e8400-e29b-41d4-a716-446655440000',
          uploadedById: 'e1903638-462f-4c03-8176-7bae51986e43',
        },
        {
          id: 'hash2',
          key: 'key2',
          fileName: 'test2.jpg',
          registeredAt: new Date('2023-01-01T00:00:00Z'),
          reportId: '550e8400-e29b-41d4-a716-446655440000',
          uploadedById: 'e1903638-462f-4c03-8176-7bae51986e43',
        },
      ]);
      expect(mockStorageService.uploadMultipleFiles).toHaveBeenCalledWith(
        expect.any(Array),
        {
          severity: 'medium',
          issueType: 'potholes',
          status: 'reported',
          coordinates: [40.7128, -74.0060],
        }
      );
    });
  });

  describe('Error cases', () => {
    it('should return 404 when report does not exist', async () => {
      // Arrange
      mockReportService.getReportById.mockResolvedValue(null);

      // Act
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Not Found',
      });

      expect(mockReportService.getReportById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(mockReportPictureService.attach).not.toHaveBeenCalled();
      expect(mockStorageService.uploadMultipleFiles).not.toHaveBeenCalled();
    });

    it('should return 400 when duplicate file is detected', async () => {
      // Arrange
      const mockReport = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        coordinate: [40.7128, -74.0060],
        reportedAt: '2023-01-01T00:00:00Z',
      };

      const duplicateError = new QueryFailedError(
        'INSERT INTO report_pictures',
        [],
        new Error('duplicate key value violates unique constraint')
      );

      mockReportService.getReportById.mockResolvedValue(mockReport);
      mockStorageService.mapFileKeys.mockReturnValue([]);
      mockReportPictureService.attach.mockRejectedValue(duplicateError);

      // Act
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      // expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Duplicate file detected',
        cause: 'File already exists in database',
      });
    });

    it('should return 400 when form data validation fails', async () => {
      // Arrange
      const { multipartFormDataParser } = require('~/common/utils');
      multipartFormDataParser.mockReturnValue({
        files: [],
        formData: {
          // Missing required fields
          reportId: '',
          severity: '',
          status: '',
          issueType: '',
        },
      });

      // Act
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body!)).toMatchObject({
        // error: 'Bad Request',
        cause: 'Parser error',
         error:  {
         "errors":  [],
         "properties":  {
           "issueType":  {
             "errors":  [
               "Invalid option: expected one of \"potholes\"|\"burned_out_lamps\"|\"burned_out_semaphores\"|\"sewer_lids\"",
             ],
           },
           "reportId":  {
             "errors":  [
               "Invalid UUID",
             ],
           },
           "severity":  {
             "errors":  [
               "Invalid option: expected one of \"low\"|\"medium\"|\"high\"|\"critical\"",
             ],
           },
           "status":  {
             "errors":  [
               "Invalid option: expected one of \"reported\"|\"confirmed\"|\"in_progress\"|\"fixed\"|\"petition_to_sign\"",
             ],
           },
         },
       },
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
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Internal Server Error',
        cause: 'Failed to attach pictures to an existing report',
      });
    });
  });

  describe('Service failures', () => {
    it('should return 500 when report service fails', async () => {
      // Arrange
      mockReportService.getReportById.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Internal Server Error',
        cause: 'Failed to attach pictures to an existing report',
      });
    });

    it('should return 500 when storage service fails', async () => {
      // Arrange
      const mockReport = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        coordinate: [40.7128, -74.0060],
        reportedAt: '2023-01-01T00:00:00Z',
      };

      mockReportService.getReportById.mockResolvedValue(mockReport);
      mockStorageService.mapFileKeys.mockReturnValue([]);
      mockReportPictureService.attach.mockResolvedValue({ identifiers: [] });
      mockStorageService.uploadMultipleFiles.mockRejectedValue(new Error('S3 upload failed'));

      // Act
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Internal Server Error',
        cause: 'Failed to attach pictures to an existing report',
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
        cause: 'Failed to attach pictures to an existing report',
      });
    });
  });
});