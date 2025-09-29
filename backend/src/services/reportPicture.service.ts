import { ReportPicture } from '~/database/entities/ReportPicture';
import { IReportPictureRepository } from '~/database/repositories/pictures.repository';
import { DeleteResult, InsertResult } from 'typeorm';
import { DetachData } from '~/common/types';


export class ReportPictureService {
    constructor(private readonly reportPictureRepository: IReportPictureRepository) {}


    async getPictureById(id: string): Promise<ReportPicture | undefined> {
        const reports = await this.reportPictureRepository.find({ id });
        return reports[0];
    }

    async getPicturesByUser(uploadedById: string): Promise<Array<ReportPicture> | null> {
        return await this.reportPictureRepository.find({ uploadedById })
    }

    /**
     * @description
     * @param data 
     * @returns 
     */
    async attach(data: Array<Partial<ReportPicture>>): Promise<InsertResult> {
        return await this.reportPictureRepository.attach(data);
    }

    /**
     * @description Detach a picture by using it's pictureId from a given report
     * @param data 
     * @returns 
     */
    async detach(data: DetachData): Promise<DeleteResult> {
        return await this.reportPictureRepository.detach(data);
    }

    /**
     * @description
     * @param hashes 
     * @returns 
     */
    async getPicturesByHashes(hashes: string[]): Promise<Array<ReportPicture> | null> {
        return await this.reportPictureRepository.findByHashes(hashes);
    }


    /**
     * @description updated the values for verified pictures
     * @param data 
     * @returns 
     */
    async verify(data: Partial<ReportPicture>) {
        return await this.reportPictureRepository.verify(data);
    }

    /**
     * @description Find a picture by reportId and key
     * @param reportId 
     * @param key 
     * @returns 
     */
    async getPictureByReportAndKey(reportId: string, key: string): Promise<ReportPicture | undefined> {
        // return await this.reportPictureRepository.findByReportAndKey(reportId, key);
        const reports = await this.reportPictureRepository.find({ reportId, key });
        return reports[0];
    }
}