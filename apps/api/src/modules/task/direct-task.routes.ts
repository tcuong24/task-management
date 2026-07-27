import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../auth/auth.middleware';
import * as directTaskController from './direct-task.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

const router = Router();

router.use(authenticate);

router.post('/', directTaskController.createDirectTaskHandler);
router.post('/labels', directTaskController.createLabelHandler);
router.get('/:id', directTaskController.getTaskByIdHandler);
router.patch('/:id', directTaskController.patchTaskHandler);
router.post('/:id/comments', directTaskController.addCommentHandler);
router.post('/:id/attachments', upload.single('file'), directTaskController.uploadAttachmentHandler);
router.delete('/attachments/:attachmentId', directTaskController.deleteAttachmentHandler);

export default router;
