/**
 * @openapi
 * /organizations/{id}/search:
 *   get:
 *     tags: [Search]
 *     summary: Tìm kiếm toàn cục trong tổ chức
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           maxLength: 100
 *       - in: query
 *         name: types
 *         schema:
 *           type: string
 *           example: tasks,projects,members
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 5
 *     responses:
 *       200:
 *         description: Kết quả được nhóm theo loại
 *       400:
 *         description: Tham số không hợp lệ
 *       403:
 *         description: Không có quyền truy cập tổ chức
 */

import { Router } from 'express';
import { globalSearchHandler } from './search.controller';

const router = Router({ mergeParams: true });
router.get('/', globalSearchHandler);

export default router;
