import type { APIGatewayProxyEventV2 } from '@aws-lambda-powertools/parser/types';
import type { LambdaInterface } from '@aws-lambda-powertools/commons/types';
import type { APIGatewayProxyResultV2, Context } from 'aws-lambda';
import {
  InternalServerErrorException,
  OK,
  BadRequestException,
  multipartFormDataParser,
  PayloadTooLargeException,
  checkBodySize,
} from '~/common/utils';

import {
  getSeverityLevelIndex,
  getIssueTypeIndex,
  getPotholeStatusIndex,
} from '~/common/getMapTypes';
import { ReportSchema, ReportType } from '~/common/validators';
import { ZodError, treeifyError } from 'zod';
import { DatabaseConnection } from '~/database/dataSource';
import { ReportFactory } from '~/database/factories/report.factory';
import { ReportPictureFactory } from '~/database/factories/reportPicture.factory';
import { StorageService } from '~/services/storage.service';

type JWT = {
  userId: string;
};

class Lambda implements LambdaInterface {
  private readonly _ = DatabaseConnection.initialize();
  private readonly reportService = ReportFactory.createReportService();
  private readonly reportPictureService = ReportPictureFactory.createService();
  constructor(private readonly storageService: StorageService) {}

  /**
   * @description
   * @param event
   * @param context
   * @returns
   */
  public async handler(event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2> {
    try {
      checkBodySize(event);

      if (!event.headers.mode) {
        throw new Error(`mode header isn't available`);
      }

      const data = await this.createReport(event);

      return OK({ data });
    } catch (error: any) {
      console.error('Handler error:', error);

      if (error instanceof ZodError) {
        return BadRequestException({
          cause: 'Parser error',
          error: treeifyError(error),
        });
      }

      if (
        error.message.includes(`mode header isn't available`) ||
        error.message.includes('Missing required fields') ||
        error.message.includes('No pothole data provided') ||
        error.message.includes('Invalid amount of images')
      ) {
        return BadRequestException({ cause: error.message });
      }

      if (error.message.includes('Payload too large')) {
        return PayloadTooLargeException();
      }

      return InternalServerErrorException({
        cause: 'Failed to create',
      });
    }
  }

  /**
   * @description
   * @param event
   * @returns
   */
  private async createReport(event: APIGatewayProxyEventV2) {
    try {

      const jwtPayload: JWT = { userId: 'e1903638-462f-4c03-8176-7bae51986e43', };
      const { files, formData } = multipartFormDataParser(event);
      const report: ReportType = ReportSchema.parse(formData);
      const reportId = await this.saveDetails(report, jwtPayload);

      const { severity, status, issueType, reportedAt, coordinate } = report;

      let result;
      if (event.headers.mode === 'full') {
        const keys = this.storageService.mapFileKeys(
          issueType,
          reportId,
          files
        );
        result = await this.reportPictureService.attach(keys.map(({ key, fileName, hash }) => ({
            id: hash,
            key,
            fileName,
            registeredAt: new Date(reportedAt),
            reportId,
            uploadedById: jwtPayload.userId,
          }))
        );

        await this.storageService.uploadMultipleFiles(files, {
          severity,
          issueType,
          status,
          coordinates: coordinate,
        });
      }

      return {
        message: 'Your report was created successfully',
        reportId,
        result: result?.identifiers,
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  /**
   * @description
   * @param report
   * @returns
   */
  private async saveDetails(report: ReportType, jwt: JWT): Promise<string> {
    const { severity, issueType, status, reportedAt, ...remaining } = report;
    const payload = {
      ...remaining,
      reportedAt: new Date(reportedAt),
      reportedById: jwt.userId,
      issueTypeId: getIssueTypeIndex(issueType),
      statusId: getPotholeStatusIndex(status),
      severityId: getSeverityLevelIndex(severity),
    };

    const { id } = await this.reportService.saveReport(payload);

    return id;
  }
}

const λ = new Lambda(new StorageService());

export const handler = λ.handler.bind(λ);
