import { ReportPicture } from '~/database/entities/ReportPicture';
import { FindOptionsWhere, Repository, UpdateResult, DeleteResult, InsertResult, In } from 'typeorm';
import { DetachData } from '~/common/types';

export interface IReportPictureRepository {
    find(where: FindOptionsWhere<ReportPicture>): Promise<Array<ReportPicture>>;
    attach(data: Array<Partial<ReportPicture>>): Promise<InsertResult>;
    verify(data: Partial<ReportPicture>): Promise<UpdateResult>;
    detach(data: DetachData): Promise<DeleteResult>;
    findByHashes(hashes: string[]): Promise<Array<ReportPicture> | null>;
    findByReportAndKey(reportId: string, key: string): Promise<ReportPicture | undefined>;
}

export class ReportPictureRepository  implements IReportPictureRepository {

    private readonly repository: Repository<ReportPicture>;
    constructor(private readonly dataSource: any) {
        this.repository = dataSource.getRepository(ReportPicture);
    }

    /**
     * @description Attach new pictures to an existing Report
     * @param data 
     * @returns 
     */
    async attach(data: Array<Partial<ReportPicture>>): Promise<InsertResult> {
        return await this.repository.insert(data);
    }

    /**
     * @description Update the details of the picture after being validated by AWS Rekognition
     * @param data 
     * @returns 
     */
    async verify(data: Partial<ReportPicture>): Promise<UpdateResult> {

        const { id, reportId, key, url, previewUrl, validated, validatedByUsers } = data;

        if (id && reportId && key && previewUrl && url) {
            return await this.repository.update({ id, reportId }, 
                {  
                    key,
                    url, 
                    previewUrl,
                    validated: validated ?? false,
                    validatedByUsers: validatedByUsers ?? false, 
                    updatedAt: new Date(),
                });
        } else {
            throw new Error('Please send the id of the picture and the reportId to verify the picture'); 
        }
    }

    /**
     * @description Find by filters
     * @param id 
     * @returns 
     */
    async find(where: FindOptionsWhere<ReportPicture>): Promise<Array<ReportPicture>> {
        return await this.repository.find({ where });
    }


    /**
     * @description Detach a picture by using it's pictureId from a given report
     * @param param0 
     * @returns 
     */
    async detach({ validated, validatedByUsers, reportId, pictureId }: DetachData): Promise<DeleteResult> {
        
        if (validated || validatedByUsers) {
            throw new Error('Policy does not allow to delete validated pictures');
        }

        if (pictureId && reportId) {
           return await this.repository.delete({
                id: pictureId,
                reportId: reportId
            });
        } else {
            throw new Error('PictureId and reportId must be present to delete a picture');
        }
    }


    /**
     * @description Find pictures by their hash IDs
     * @param hashes 
     * @returns 
     */
    async findByHashes(hashes: string[]): Promise<Array<ReportPicture> | null> {
        if (hashes.length === 0) return [];
    
        return await this.repository.find({
            where: {
                id: In(hashes)
            },
            select: {
                id: true,
                key: true
            }
        });
    }

    /**
     * @description Find a picture by reportId and key
     * @param reportId 
     * @param key 
     * @returns 
     */
    async findByReportAndKey(reportId: string, key: string): Promise<ReportPicture | undefined> {
        const pictures = await this.repository.find({
            where: {
                reportId,
                key
            }
        });
        
       return pictures && pictures.length > 0 ? pictures[0] : undefined;
    }
}