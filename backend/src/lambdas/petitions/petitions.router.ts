import { Router } from 'express';

import createSignPetitioRouter from './create-sign-petition/main.router';
import signPetitionRouter from './sign-petitions/main.router';

const router = Router();

router.use('/petitions', createSignPetitioRouter);
router.use('/petitions', signPetitionRouter);

export default router;
