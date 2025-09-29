
import { getQueryStringsParams, getHeaders, getServerContext, sendResponse } from '~/common/serverUtils';
import type { APIGatewayProxyEventV2 } from '@aws-lambda-powertools/parser/types';
import { Router, Request, Response } from 'express';
import { handler } from './main';

const router = Router();

router.post('/create-sign-petition', async (req: Request, res: Response) => {
 reportController(req, res, { path: '/create-sign-petition' });
});


const reportController = async (req: Request, res: Response, { path }: { path: string }) => {
   try {

    const event: APIGatewayProxyEventV2 = {
      version: '2.0',
      routeKey: '$default',
      rawPath: path,
      rawQueryString: '',
      headers: getHeaders(req),
      queryStringParameters: getQueryStringsParams(req),
      requestContext: {
        accountId: '123456789012',
        apiId: 'api-id',
        authentication: null,
        authorizer: {},
        domainName: 'localhost',
        domainPrefix: 'localhost',
        http: {
          method: 'POST',
          path,
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
      body: Buffer.from(req.body).toString(),
      isBase64Encoded: true,
      pathParameters: {},
      stageVariables: {},
    };

    const context = getServerContext();
    const result = await handler(event as any, context);

    sendResponse(res, result);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}

export default router;