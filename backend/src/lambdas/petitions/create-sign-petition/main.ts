import type {
  APIGatewayProxyEventV2,
  ParsedResult,
} from '@aws-lambda-powertools/parser/types';
import type { LambdaInterface } from '@aws-lambda-powertools/commons/types';
import type { Context } from 'aws-lambda';
import {
  InternalServerErrorException,
  BadRequestException,
  OK
} from '~/common/utils';
import { parser } from '@aws-lambda-powertools/parser';
import {
  CreatePetitionRequestBodySchema,
  CreatePetitionRequestBodyType,
} from '~/common/validators';
import { DatabaseConnection } from '~/database/dataSource';
import { PetitionFactory } from '~/database/factories/petition.factory';
import { ReportFactory } from '~/database/factories/report.factory';

class Lambda implements LambdaInterface {
  private readonly _ = DatabaseConnection.initialize();
  private readonly petitionService = PetitionFactory.createPetitionService();
  private readonly reportService = ReportFactory.createReportService();

  @parser({ schema: CreatePetitionRequestBodySchema, safeParse: true })
  public async handler(
    event: ParsedResult<APIGatewayProxyEventV2, CreatePetitionRequestBodyType>,
    _context: Context
  ) {
    try {
      if (!event.success) {
        return BadRequestException({ cause: 'Validation error' });
      }

      //
      const { title, description, reportedById, reportsId } = event.data.body;

      //
      const reports = await this.reportService.findByMultiple(reportsId);

      //
      const { id } = await this.petitionService.create({
        title,
        description,
        reports,
        currentSignatures: 0,
        reportedById,
      });

      return OK({ result: 'Petition was created successfully', petitionId: id });
    } catch (error) {
      console.error(error);
      return InternalServerErrorException();
    }
  }
}

const λ = new Lambda();

export const handler = λ.handler.bind(λ);