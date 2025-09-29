import { handler } from '~/lambdas/reports/list-reports/main';
import { ReportFactory } from '~/database/factories/report.factory';
import { DatabaseConnection } from '~/database/dataSource';
import { QueryFailedError } from 'typeorm';
import type { APIGatewayProxyEventV2 } from '@aws-lambda-powertools/parser/types';
import type { Context, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

// Mock the database connection
jest.mock('~/database/dataSource');

// Mock the factories
jest.mock('~/database/factories/report.factory');

describe('List Reports Lambda', () => {
  let mockReportService: any;
  let mockEvent: APIGatewayProxyEventV2;
  let mockContext: Context;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock services
    mockReportService = {
      getReportById: jest.fn(),
      getAllReports: jest.fn(),
    };

    // Mock factory returns
    (ReportFactory.createReportService as jest.Mock).mockReturnValue(mockReportService);

    // Mock database connection
    (DatabaseConnection.initialize as jest.Mock).mockResolvedValue(undefined);

    // Mock event
    mockEvent = {
      pathParameters: null,
      queryStringParameters: undefined,
      headers: {},
      isBase64Encoded: false,
      requestContext: {} as any,
      routeKey: 'GET /reports',
      version: '2.0',
    };

    mockContext = {} as Context;
  });

  describe('Get single report by ID', () => {
    it('should return a report when valid ID is provided', async () => {
      // Arrange
      const mockReport = {
        id: 'report-123',
        description: 'Test report',
        address: '123 Test St',
      };

      mockEvent.pathParameters = { reportId: 'report-123' };
      mockReportService.getReportById.mockResolvedValue(mockReport);

      // Act
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body!)).toEqual({
        result: mockReport,
      });
      expect(mockReportService.getReportById).toHaveBeenCalledWith('report-123');
    });

    it('should return 404 when report is not found', async () => {
      // Arrange
      mockEvent.pathParameters = { reportId: 'nonexistent-id' };
      mockReportService.getReportById.mockResolvedValue(null);

      // Act
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Not Found',
      });
      expect(mockReportService.getReportById).toHaveBeenCalledWith('nonexistent-id');
    });
  });

  describe('Get all reports with filters', () => {
    it('should return paginated reports when no filters are provided', async () => {
      // Arrange
      const mockReportsResponse = {
        data: [
          { id: 'report-1', description: 'Report 1' },
          { id: 'report-2', description: 'Report 2' },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };

      mockReportService.getAllReports.mockResolvedValue(mockReportsResponse);

      // Act
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body!)).toEqual(mockReportsResponse);
      expect(mockReportService.getAllReports).toHaveBeenCalledWith(undefined);
    });

    it('should return filtered reports when query parameters are provided', async () => {
      // Arrange
      const mockReportsResponse = {
        data: [{ id: 'report-1', description: 'Filtered report' }],
        total: 1,
        page: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };

      mockEvent.queryStringParameters = {
        severity: '2',
        status: '1',
        page: '1',
      };

      mockReportService.getAllReports.mockResolvedValue(mockReportsResponse);

      // Act
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body!)).toEqual(mockReportsResponse);
      expect(mockReportService.getAllReports).toHaveBeenCalledWith({
        severity: '2',
        status: '1',
        page: '1',
      });
    });
  });

  describe('Error handling', () => {
    it('should return 400 when QueryFailedError occurs', async () => {
      // Arrange
      const queryError = new QueryFailedError('SELECT * FROM reports', [], new Error('SQL syntax error'));
      mockReportService.getAllReports.mockRejectedValue(queryError);

      // Act
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Bad Request',
      });
    });

    it('should return 500 when unexpected error occurs', async () => {
      // Arrange
      mockReportService.getAllReports.mockRejectedValue(new Error('Unexpected error'));

      // Act
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Internal Server Error',
      });
    });

    it('should return 500 when getReportById throws unexpected error', async () => {
      // Arrange
      mockEvent.pathParameters = { reportId: 'report-123' };
      mockReportService.getReportById.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Internal Server Error',
      });
    });
  });
});