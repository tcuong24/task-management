import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';

const options = {
  definition: {
  openapi: '3.0.0',
  info: {
    title: 'TaskFlow API',
    version: '1.0.0',
    description: 'Tài liệu hướng dẫn & thử nghiệm API cho nền tảng quản lý công việc TaskFlow.',
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Local Backend API Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Đăng ký tài khoản mới',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password', 'fullName'],
                properties: {
                  username: { type: 'string', minLength: 3, maxLength: 30, pattern: '^[a-zA-Z0-9_]+$' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  fullName: { type: 'string' },
                },
              },
              example: {
                username: 'john_doe',
                email: 'john@example.com',
                password: 'securePassword123',
                fullName: 'John Doe',
              },
            },
          },
        },
        responses: {
          201: { description: 'Đăng ký thành công' },
          400: { description: 'Dữ liệu đầu vào không hợp lệ' },
          409: { description: 'Tên đăng nhập đã tồn tại' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Đăng nhập',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string' },
                  password: { type: 'string' },
                  rememberMe: { type: 'boolean' },
                },
              },
              example: {
                username: 'john_doe',
                password: 'securePassword123',
                rememberMe: true,
              },
            },
          },
        },
        responses: {
          200: { description: 'Đăng nhập thành công' },
          400: { description: 'Thiếu tên đăng nhập hoặc mật khẩu' },
          401: { description: 'Tên đăng nhập hoặc mật khẩu không chính xác' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Lấy Access Token mới',
        responses: {
          200: { description: 'Refresh thành công' },
          401: { description: 'Token không hợp lệ hoặc đã hết hạn' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Đăng xuất',
        responses: {
          204: { description: 'Đăng xuất thành công' },
        },
      },
    },
    '/me': {
      get: {
        tags: ['User Profile'],
        summary: 'Lấy thông tin tài khoản hiện tại',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Thông tin tài khoản' },
          401: { description: 'Chưa xác thực hoặc token không hợp lệ' },
        },
      },
    },
    '/': {
      get: {
        tags: ['General'],
        summary: 'Kiểm tra hoạt động hệ thống',
        responses: {
          200: { description: 'API is running' },
        },
      },
    },
  },
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.controller.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log('Swagger API Docs initialized at http://localhost:3001/api-docs');
};
