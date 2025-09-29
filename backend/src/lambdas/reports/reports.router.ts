import { Router } from 'express';
import listReportsRouter from './list-reports/main.router';
import createReportRouter from './create-reports/main.router';
import attachPicturesRouter from './attach-pictures/main.router';
import detachPicturesRouter from './detach-pictures/main.router';

const router = Router();

router.use('/reports', listReportsRouter);
router.use('/reports', createReportRouter)
router.use('/reports', attachPicturesRouter);
router.use('/reports', detachPicturesRouter);

export default router;
