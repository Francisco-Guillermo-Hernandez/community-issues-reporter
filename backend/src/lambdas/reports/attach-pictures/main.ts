
import { InternalServerErrorException, OK, checkBodySize, multipartFormDataParser, BadRequestException, NotFoundException } from '~/common/utils';
import type { APIGatewayProxyEventV2 } from '@aws-lambda-powertools/parser/types';
import { ReportPictureFactory } from '~/database/factories/reportPicture.factory';
import { StorageService } from '~/services/storage.service';
import type { LambdaInterface, } from '@aws-lambda-powertools/commons/types';
import type {  APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { ReportFactory } from '~/database/factories/report.factory';
import { MetadataSchema, MetadataType } from '~/common/validators';
import { DatabaseConnection } from '~/database/dataSource';
import { QueryFailedError} from 'typeorm';
import { ZodError, treeifyError } from 'zod';

type JWT = {
  userId: string;
}

class Lambda implements LambdaInterface {

    private readonly _ = DatabaseConnection.initialize();

    public async handler(event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2> {
        try {
            checkBodySize(event);
            const { files, formData } = multipartFormDataParser(event);   
            const reportPictureMetadata: MetadataType = MetadataSchema.parse(formData);
            const { reportId, severity, status, issueType } = reportPictureMetadata;

            const jwtPayload: JWT = { userId: 'e1903638-462f-4c03-8176-7bae51986e43' };

            const reportPictureService = ReportPictureFactory.createService();
            const reportService = ReportFactory.createReportService();
            const storageService = new StorageService();

            const existingReport = await reportService.getReportById(reportId);

            if (!existingReport) {
                return NotFoundException();
            }
    
            const { coordinate, reportedAt } = existingReport;
            const keys = storageService.mapFileKeys(issueType, reportId, files);
            const result = await reportPictureService.attach(keys.map(({ key, fileName, hash }) => ({
                    id: hash,
                    key,
                    fileName,
                    registeredAt: new Date(reportedAt),
                    reportId,
                    uploadedById: jwtPayload.userId,
                })
            ));

           await storageService.uploadMultipleFiles(files, {
                severity,
                issueType,
                status,
                coordinates: coordinate
            });

          
            return OK({
                message: 'The pictures were attached to the report', result: result.identifiers
            });
        } catch (error: any) {
            console.error(error);

            if (error instanceof QueryFailedError) {
                if (error.message.includes('duplicate key value violates unique constraint')) {
                    return BadRequestException({ error: 'Duplicate file detected', cause: 'File already exists in database' });
                }
            }

            if (error instanceof ZodError) {
                return BadRequestException({ cause:  'Parser error', error: treeifyError(error) })
            }
            
            return InternalServerErrorException({ cause: 'Failed to attach pictures to an existing report' });
        }
    }

   
}


const λ = new Lambda();

export const handler = λ.handler.bind(λ);