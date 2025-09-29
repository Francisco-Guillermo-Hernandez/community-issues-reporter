
import { SignPetitionRequestBodySchema, SignPetitionRequestBodyType, SignPetitionType } from '~/common/validators';
import { InternalServerErrorException, BadRequestException, NotFoundException, OK } from '~/common/utils';
import type { APIGatewayProxyEventV2, ParsedResult } from '@aws-lambda-powertools/parser/types';
import { SignPetitionFactory } from '~/database/factories/signPetition.factory';
import type { LambdaInterface, } from '@aws-lambda-powertools/commons/types';
import { PetitionFactory } from '~/database/factories/petition.factory';
import { UserFactory } from '~/database/factories/user.factory';
import { DatabaseConnection } from '~/database/dataSource';
import { parser } from '@aws-lambda-powertools/parser';
import type { Context } from 'aws-lambda';


class Lambda implements LambdaInterface {

    private readonly _ = DatabaseConnection.initialize();

    @parser({ schema: SignPetitionRequestBodySchema, safeParse: true })
    public async handler(event: ParsedResult<APIGatewayProxyEventV2, SignPetitionRequestBodyType>, _context: Context) {
        try {
            if (!event.success) {
                return BadRequestException({ cause: 'Validation error' });
            }

            return await this.signPetition(event.data.body);

        } catch (error) {
            console.error(error);
            return InternalServerErrorException();
        }
    }

    /**
     * @description
     * @param param0 
     * @returns 
     */
    public async signPetition({ userId, petitionId, youAreAffectedDirectly, youAreAffectedIndirectly }: SignPetitionType) {
        const userService = UserFactory.createUserService();
        const petitionService = PetitionFactory.createPetitionService();
        const signPetitionService = SignPetitionFactory.createSignPetitionService();

        // Check if user exists
        const user = await userService.getUserById(userId);
        if (!user) {
            return NotFoundException({ error: `User doesn't exist`, cause: 'user not found' });
        }

        // Check if petition exists
        const petition = await petitionService.findOne(petitionId);
        if (!petition) {
            return NotFoundException( { error: `The petition doesn't exist`, cause: 'petition not found' });
        }

        // Check if user has already signed this petition
        const hasAlreadySigned = await signPetitionService.checkIfUserAlreadySigned(petitionId, userId);
        if (hasAlreadySigned) {
            return BadRequestException({ error: `User has already signed this petition`, cause: 'duplicate signature' });
        }

        // Create the signature
        const signPetition = await signPetitionService.signPetition({
            petitionId,
            signedById: userId,
            youAreAffectedDirectly,
            youAreAffectedIndirectly, 
        });

        return OK({
            result: {
                id: signPetition.id,
                signDate: signPetition.signDate
            }
        })
    }
}


const λ = new Lambda();

export const handler = λ.handler.bind(λ);