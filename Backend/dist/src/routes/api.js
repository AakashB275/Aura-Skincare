import { Router } from 'express';
import callRouter from './call.js';
import speechRouter from './speech.js';
import authenticateNeonUser from '../middlewares/authenticateNeonUser.js';
const apiRouter = Router();
apiRouter.use(authenticateNeonUser);
apiRouter.use('/call', callRouter);
apiRouter.use('/speech', speechRouter);
export default apiRouter;
