import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { authenticate } from '../auth/auth.middleware';
import * as directTaskController from './direct-task.controller';
import {
  getPlatformSetting,
  isAllowedUploadType,
} from '../../common/services/platformSetting.service';
import { AppError } from '../../common/errors';

const uploadAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [maxSizeMb, allowedTypes] = await Promise.all([
      getPlatformSetting('max_upload_size_mb'),
      getPlatformSetting('allowed_file_types'),
    ]);

    multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: maxSizeMb * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        if (isAllowedUploadType(file, allowedTypes)) {
          callback(null, true);
          return;
        }

        callback(new AppError(415, 'FILE_TYPE_NOT_ALLOWED', 'Loại file này không được phép tải lên.'));
      },
    }).single('file')(req, res, (error) => {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        next(new AppError(413, 'FILE_TOO_LARGE', `File không được vượt quá ${maxSizeMb} MB.`));
        return;
      }

      next(error);
    });
  } catch (error) {
    next(error);
  }
};

const router = Router();

router.use(authenticate);

router.post('/', directTaskController.createDirectTaskHandler);
router.post('/labels', directTaskController.createLabelHandler);
router.get('/:id', directTaskController.getTaskByIdHandler);
router.patch('/:id', directTaskController.patchTaskHandler);
router.post('/:id/comments', directTaskController.addCommentHandler);
router.post('/:id/attachments', uploadAttachment, directTaskController.uploadAttachmentHandler);
router.delete('/attachments/:attachmentId', directTaskController.deleteAttachmentHandler);

export default router;
