import { Router } from 'express';
import { synthesizeSpeech } from '../controllers/speechController.js';

const speechRouter = Router();

speechRouter.post('/synthesize', synthesizeSpeech);

export default speechRouter;
