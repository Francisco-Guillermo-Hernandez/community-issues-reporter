import { InternalServerErrorException, OK, BadRequestException, NotFoundException } from '~/common/utils';
import type { APIGatewayProxyEventV2, ParsedResult } from '@aws-lambda-powertools/parser/types';
import { DetachPictureBodySchema, DetachPictureBodyType } from '~/common/validators';
import { ReportPictureFactory } from '~/database/factories/reportPicture.factory';
import type { LambdaInterface } from '@aws-lambda-powertools/commons/types';
import { ReportFactory } from '~/database/factories/report.factory';
import type { APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { StorageService } from '~/services/storage.service';
import { DatabaseConnection } from '~/database/dataSource';
import { parser } from '@aws-lambda-powertools/parser';
import { ZodError, treeifyError } from 'zod';

type JWT = {
  userId: string;
}

class Lambda implements LambdaInterface {

    private readonly _ = DatabaseConnection.initialize();
    private readonly reportPictureService = ReportPictureFactory.createService();
    private readonly reportService = ReportFactory.createReportService();
    constructor(private readonly storageService: StorageService) {}

    @parser({ schema: DetachPictureBodySchema, safeParse: true })
    public async handler(event: ParsedResult<APIGatewayProxyEventV2, DetachPictureBodyType>, context: Context): Promise<APIGatewayProxyResultV2> {
        try {

            if (!event.success)
                return BadRequestException({ cause: 'Validation error' });            

            const { pictureId, reportId } = event.data.body;

            // Check if the report exists
            const existingReport = await this.reportService.getReportById(reportId);
            if (!existingReport)
                return NotFoundException({ cause: 'Report not found' });

            // Check if the picture exists
            const existingPicture = await this.reportPictureService.getPictureById(pictureId);
            if (!existingPicture)
                return NotFoundException({ cause: 'Picture not found' });

            if (existingPicture.reportId !== reportId) 
                return BadRequestException({ cause: 'Picture does not belong to the specified report' });

            if (existingPicture.validated)
                return BadRequestException({ error: 'Cannot delete validated picture', cause: 'Policy does not allow deletion of validated pictures' });

            const detachResult = await this.reportPictureService.detach({
                pictureId,
                reportId,
                validated: existingPicture.validated,
                validatedByUsers: false
            });

            // If database deletion was successful, delete from S3
            if (detachResult.affected && detachResult.affected > 0)
                await this.storageService.deleteFileFromS3(existingPicture.key);

            return OK({
                message: 'Picture successfully detached from report',
                result: { deletedRecords: detachResult.affected ?? 0 }
            });

        } catch (error: any) {
            console.error(error);

            if (error instanceof ZodError) {
                return BadRequestException({ 
                    cause: 'Validation error', 
                    error: treeifyError(error) 
                });
            }
            
            return InternalServerErrorException({ 
                cause: 'Failed to detach picture from report' 
            });
        }
    }
}

const λ = new Lambda(new StorageService());

export const handler = λ.handler.bind(λ);