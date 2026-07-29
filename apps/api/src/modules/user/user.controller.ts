import { Request, Response, NextFunction } from 'express';
import * as userService from './user.service';

export async function getMeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const user = await userService.getMe(userId);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

export async function updateMeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { fullName, avatarUrl, email } = req.body;
    const updatedUser = await userService.updateMe(userId, { fullName, avatarUrl, email });
    res.json({ success: true, user: updatedUser, message: 'Cập nhật thông tin thành công.' });
  } catch (err) {
    next(err);
  }
}

export async function changePasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }

    await userService.changePassword(userId, oldPassword, newPassword);
    res.json({ success: true, message: 'Đổi mật khẩu thành công.' });
  } catch (err) {
    next(err);
  }
}

export async function uploadAvatarHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, message: 'Vui lòng chọn file hình ảnh.' });
      return;
    }

    const updatedUser = await userService.uploadUserAvatar(userId, file.buffer, file.mimetype);
    res.json({ success: true, user: updatedUser, message: 'Tải ảnh đại diện lên Cloudinary thành công.' });
  } catch (err) {
    next(err);
  }
}

export async function searchUsersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const q = (req.query.q as string) || '';
    const users = await userService.searchUsers(q);
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
}
