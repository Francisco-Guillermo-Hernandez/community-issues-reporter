import { ReportPictureRepository, IReportPictureRepository } from '~/database/repositories/pictures.repository';
import { DatabaseConnection } from '~/database/dataSource';
import { ReportPictureService } from '~/services/reportPicture.service';

export class ReportPictureFactory {

    static createRepository(): IReportPictureRepository {
        const dataSource =DatabaseConnection.getDataSource();
        return new ReportPictureRepository(dataSource);
    }

    static createService(): ReportPictureService {
        const repository = this.createRepository();
        return new ReportPictureService(repository);
    }
}