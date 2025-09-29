import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import reportsRouter from './reports/reports.router';
import petitionsRouter from './petitions/petitions.router';

const app = express();
app.disable('x-powered-by');
app.use(express.raw({ type: ['multipart/form-data', 'application/json'], limit: '50mb' }));


app.use('/', reportsRouter);
app.use('/', petitionsRouter);


const PORT = process.env.PORT ?? 3030;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
