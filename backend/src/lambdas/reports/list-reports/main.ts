
import { InternalServerErrorException, OK, NotFoundException, BadRequestException } from '~/common/utils';
import type { APIGatewayProxyEventV2 } from '@aws-lambda-powertools/parser/types';
import type { LambdaInterface } from '@aws-lambda-powertools/commons/types';
import { ReportFactory } from '~/database/factories/report.factory';
import { DatabaseConnection } from '~/database/dataSource';
import { QueryFailedError } from 'typeorm';
import type { Context, APIGatewayProxyResultV2 } from 'aws-lambda';

class Lambda implements LambdaInterface {
    private readonly _ = DatabaseConnection.initialize();
    
    public async handler(event: APIGatewayProxyEventV2, _context: Context):  Promise<APIGatewayProxyResultV2> {
        
        try {
            const reportService = ReportFactory.createReportService();
            const reportId = event?.pathParameters?.reportId;

            if (reportId) {

                const result = await reportService.getReportById(reportId);
                
                if (!result) {
                    return NotFoundException();
                }
                
                return OK({ result });
            } else {
                
                return OK(await reportService.getAllReports(event.queryStringParameters));
            }
        } catch (error) {
            console.log(error);

            if (error instanceof QueryFailedError) {
                return BadRequestException();
            }

            return InternalServerErrorException();
        }
    }
}


const λ = new Lambda();

export const handler = λ.handler.bind(λ);