import { handler } from './main';
import { UserFactory } from '~/database/factories/user.factory';
import { PetitionFactory } from '~/database/factories/petition.factory';
import { SignPetitionFactory } from '~/database/factories/signPetition.factory';
import { DatabaseConnection } from '~/database/dataSource';
import type { APIGatewayProxyEventV2 } from '@aws-lambda-powertools/parser/types';
import type { Context, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

// Mock the database connection
jest.mock('~/database/dataSource');

// Mock the factories
jest.mock('~/database/factories/user.factory');
jest.mock('~/database/factories/petition.factory');
jest.mock('~/database/factories/signPetition.factory');

describe('Sign Petitions Lambda', () => {
  let mockUserService: any;
  let mockPetitionService: any;
  let mockSignPetitionService: any;
  let mockEvent: APIGatewayProxyEventV2;
  let mockContext: Context;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock services
    mockUserService = {
      getUserById: jest.fn(),
    };

    mockPetitionService = {
      findOne: jest.fn(),
    };

    mockSignPetitionService = {
      checkIfUserAlreadySigned: jest.fn(),
      signPetition: jest.fn(),
    };

    // Mock factory returns
    (UserFactory.createUserService as jest.Mock).mockReturnValue(mockUserService);
    (PetitionFactory.createPetitionService as jest.Mock).mockReturnValue(mockPetitionService);
    (SignPetitionFactory.createSignPetitionService as jest.Mock).mockReturnValue(mockSignPetitionService);

    // Mock database connection
    (DatabaseConnection.initialize as jest.Mock).mockResolvedValue(undefined);


    mockEvent = {
      version: '2.0',
      routeKey: '$default',
      rawPath: '',
      rawQueryString: '',
      headers: {},
      queryStringParameters: {},
      requestContext: {
        accountId: '123456789012',
        apiId: 'api-id',
        authentication: null,
        authorizer: {},
        domainName: 'localhost',
        domainPrefix: 'localhost',
        http: {
          method: 'POST',
          path: '',
          protocol: 'HTTP/1.1',
          sourceIp: '127.0.0.1',
          userAgent: 'node-fetch',
        },
        requestId: 'mock-request-id',
        routeKey: '$default',
        stage: '$default',
        time: new Date().toISOString(),
        timeEpoch: Math.floor(Date.now() / 1000),
      },
      isBase64Encoded: true,
      pathParameters: {},
      stageVariables: {},
      body: JSON.stringify({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        petitionId: '550e8400-e29b-41d4-a716-446655440001',
        youAreAffectedDirectly: true,
        youAreAffectedIndirectly: false,
      }),
    };

    mockContext = {} as Context;
  });

  describe('Successful petition signing', () => {
    it('should successfully sign a petition when all conditions are met', async () => {
      // Arrange
      const mockUser = { id: '550e8400-e29b-41d4-a716-446655440000', email: 'test@example.com' };
      const mockPetition = { id: '550e8400-e29b-41d4-a716-446655440001', title: 'Test Petition' };
      const mockSignPetition = {
        id: 'sign-123',
        // signDate: new Date('2023-01-01'),
      };

      mockUserService.getUserById.mockResolvedValue(mockUser);
      mockPetitionService.findOne.mockResolvedValue(mockPetition);
      mockSignPetitionService.checkIfUserAlreadySigned.mockResolvedValue(false);
      mockSignPetitionService.signPetition.mockResolvedValue(mockSignPetition);

      // Act
      const result = await handler(mockEvent as any, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body!)).toEqual({
        result: {
          id: 'sign-123',
          // signDate: new Date('2023-01-01'),
        },
      });

      expect(mockUserService.getUserById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(mockPetitionService.findOne).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
      expect(mockSignPetitionService.checkIfUserAlreadySigned).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000');
      expect(mockSignPetitionService.signPetition).toHaveBeenCalledWith({
        petitionId: '550e8400-e29b-41d4-a716-446655440001',
        signedById: '550e8400-e29b-41d4-a716-446655440000',
        youAreAffectedDirectly: true,
        youAreAffectedIndirectly: false,
      });
    });
  });

  describe('Error cases', () => {
    it('should return 400 when validation fails', async () => {
      // Arrange
      mockEvent.body = JSON.stringify({ invalidField: 'invalid' });

      // Act
      const result = await handler(mockEvent as any, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Bad Request',
        cause: 'Validation error',
      });
    });

    it('should return 404 when user does not exist', async () => {
      // Arrange
      mockUserService.getUserById.mockResolvedValue(null);

      // Act
      const result = await handler(mockEvent as any, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: "User doesn't exist",
        cause: 'user not found',
      });
    });

    it('should return 404 when petition does not exist', async () => {
      // Arrange
      const mockUser = { id: '550e8400-e29b-41d4-a716-446655440000', email: 'test@example.com' };
      mockUserService.getUserById.mockResolvedValue(mockUser);
      mockPetitionService.findOne.mockResolvedValue(null);

      // Act
      const result = await handler(mockEvent as any, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: "The petition doesn't exist",
        cause: 'petition not found',
      });
    });

    it('should return 400 when user has already signed the petition', async () => {
      // Arrange
      const mockUser = { id: '550e8400-e29b-41d4-a716-446655440000', email: 'test@example.com' };
      const mockPetition = { id: '550e8400-e29b-41d4-a716-446655440001', title: 'Test Petition' };

      mockUserService.getUserById.mockResolvedValue(mockUser);
      mockPetitionService.findOne.mockResolvedValue(mockPetition);
      mockSignPetitionService.checkIfUserAlreadySigned.mockResolvedValue(true);

      // Act
      const result = await handler(mockEvent as any, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'User has already signed this petition',
        cause: 'duplicate signature',
      });
    });

    it('should return 500 when an unexpected error occurs', async () => {
      // Arrange
      mockUserService.getUserById.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await handler(mockEvent as any, mockContext) as APIGatewayProxyStructuredResultV2;

      // Assert
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body!)).toMatchObject({
        error: 'Internal Server Error',
      });
    });
  });
});