import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../auth/auth.middleware';
import { getMeHandler, updateMeHandler, changePasswordHandler, uploadAvatarHandler } from './user.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const router = Router();

router.use(authenticate);

router.get('/me', getMeHandler);
router.patch('/me', updateMeHandler);
router.post('/me/change-password', changePasswordHandler);
router.post('/avatar', upload.single('file'), uploadAvatarHandler);

export default router;
