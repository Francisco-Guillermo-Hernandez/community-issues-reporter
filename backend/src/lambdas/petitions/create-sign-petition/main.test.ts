import { handler } from './main';
import { PetitionFactory } from '~/database/factories/petition.factory';
import { ReportFactory } from '~/database/factories/report.factory';
import { DatabaseConnection } from '~/database/dataSource';
import type { APIGatewayProxyEventV2 } from '@aws-lambda-powertools/parser/types';
import type { Context } from 'aws-lambda';

// Mock the database connection
jest.mock('~/database/dataSource');

// Mock the factories
jest.mock('~/database/factories/petition.factory');
jest.mock('~/database/factories/report.factory');

describe('Create Sign Petitions Lambda', () => {
  let mockPetitionService: any;
  let mockReportService: any;
  let mockEvent: APIGatewayProxyEventV2;
  let mockContext: Context;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock services
    mockPetitionService = {
      create: jest.fn(),
    };

    mockReportService = {
      findByMultiple: jest.fn(),
    };

    // Mock factory returns
    (PetitionFactory.createPetitionService as jest.Mock).mockReturnValue(mockPetitionService);
    (ReportFactory.createReportService as jest.Mock).mockReturnValue(mockReportService);

    // Mock database connection
    (DatabaseConnection.initialize as jest.Mock).mockResolvedValue(undefined);

    // Mock event
    mockEvent = {
      body: JSON.stringify({
        title: 'Fix the potholes on Main Street',
        description: 'There are several dangerous potholes that need immediate attention',
        reportedById: 'user-123',
        reportsId: ['report-1', 'report-2'],
      }),
      headers: {},
      isBase64Encoded: false,
      requestContext: {} as any,
      routeKey: 'POST /petitions',
      version: '2.0',
    };

    mockContext = {} as Context;
  });

  describe('Successful petition creation', () => {
    it('should successfully create a petition when all data is valid', async () => {
      // Arrange
      const mockReports = [
        { id: 'report-1', description: 'Pothole on Main St' },
        { id: 'report-2', description: 'Another pothole nearby' },
      ];

      const mockCreatedPetition = {
        id: 'petition-123',
        title: 'Fix the potholes on Main Street',
        description: 'There are several dangerous potholes that need immediate attention',
      };

      mockReportService.findByMultiple.mockResolvedValue(mockReports);
      mockPetitionService.create.mockResolvedValue(mockCreatedPetition);

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body!)).toEqual({
        result: 'Petition was created successfully',
        petitionId: 'petition-123',
      });

      expect(mockReportService.findByMultiple).toHaveBeenCalledWith(['report-1', 'report-2']);
      expect(mockPetitionService.create).toHaveBeenCalledWith({
        title: 'Fix the potholes on Main Street',
        description: 'There are several dangerous potholes that need immediate attention',
        reports: mockReports,
        currentSignatures: 0,
        reportedById: 'user-123',
      });
    });

    it('should create petition even when some reports are not found', async () => {
      // Arrange
      const mockReports = [
        { id: 'report-1', description: 'Pothole on Main St' },
        // report-2 not found
      ];

      const mockCreatedPetition = {
        id: 'petition-456',
        title: 'Fix the potholes on Main Street',
      };

      mockReportService.findByMultiple.mockResolvedValue(mockReports);
      mockPetitionService.create.mockResolvedValue(mockCreatedPetition);

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body!)).toEqual({
        result: 'Petition was created successfully',
        petitionId: 'petition-456',
      });

      expect(mockPetitionService.create).toHaveBeenCalledWith({
        title: 'Fix the potholes on Main Street',
        description: 'There are several dangerous potholes that need immediate attention',
        reports: mockReports,
        currentSignatures: 0,
        reportedById: 'user-123',
      });
    });
  });

  describe('Validation errors', () => {
    it('should return 400 when request body is invalid', async () => {
      // Arrange
      mockEvent.body = JSON.stringify({
        title: '', // Invalid: empty title
        description: 'Valid description',
        reportedById: 'user-123',
        reportsId: [],
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

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      mockEvent.body = JSON.stringify({
        title: 'Valid title',
        // Missing description, reportedById, reportsId
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

    it('should return 400 when body is not valid JSON', async () => {
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

  describe('Error handling', () => {
    it('should return 500 when report service fails', async () => {
      // Arrange
      mockReportService.findByMultiple.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Internal Server Error',
      });
    });

    it('should return 500 when petition service fails', async () => {
      // Arrange
      const mockReports = [{ id: 'report-1', description: 'Test report' }];
      mockReportService.findByMultiple.mockResolvedValue(mockReports);
      mockPetitionService.create.mockRejectedValue(new Error('Failed to create petition'));

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Internal Server Error',
      });
    });

    it('should return 500 when unexpected error occurs', async () => {
      // Arrange
      mockReportService.findByMultiple.mockImplementation(() => {
        throw new Error('Unexpected synchronous error');
      });

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Internal Server Error',
      });
    });
  });
});