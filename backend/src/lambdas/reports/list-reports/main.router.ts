import type { APIGatewayProxyEventV2 } from '@aws-lambda-powertools/parser/types';
import { getQueryStringsParams, getHeaders } from '~/common/serverUtils';
import { sendResponse, getServerContext } from '~/common/serverUtils';
import { handler } from './main';
import { Router, Request, Response } from 'express';

const router = Router();

router.get('/:reportId', async (req: Request, res: Response) => {
 reportController(req, res);
});

router.get('/', async (req: Request, res: Response) => {
 reportController(req, res);
});


const reportController = async (req: Request, res: Response) => {
   try {

    const event: APIGatewayProxyEventV2 = {
      version: '2.0',
      routeKey: '$default',
      rawPath: '/list-reports',
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
          path: '/list-reports',
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
      body: req.body ? Buffer.from(req.body).toString('base64') : undefined,
      isBase64Encoded: true,
      pathParameters: req.params ?? {},
      stageVariables: {},
    };

    const context = getServerContext();
    const result = await handler(event, context);

    sendResponse(res, result);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}

export default router;