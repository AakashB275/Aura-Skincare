import { Router } from 'express';
import { endCall, startCall, submitAnswer } from '../controllers/callController.js';

const callRouter = Router();

callRouter.post('/start', startCall);
callRouter.post('/answer', submitAnswer);
callRouter.post('/end', endCall);

export default callRouter;