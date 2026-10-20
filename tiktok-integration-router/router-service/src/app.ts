import * as dotenv from 'dotenv';
dotenv.config();

import bodyParser from 'body-parser';
import express, { Express } from 'express';

// Import routes
import CustomError from './errors/custom.error';
import { errorMiddleware } from './middleware/error.middleware';
import { jwtAuthMiddleware } from './middleware/jwt.middleware';
import RouterServiceRoutes from './routes';
import tiktokCategoryRouter from './routes/tiktok.category.route';
import tiktokInventoryRouter from './routes/tiktok.inventory.route';
import { tiktokOrderRouter } from './routes/tiktok.order.route';
import tiktokProductRouter from './routes/tiktok.product.route';
import tiktokAuthRouter from './routes/tiktok.auth.route';
import WebhookRoutes from './routes/webhook.route';
import { initializeFirestoreClient } from './utils/firestore.utils';
import genericRouter from './routes/generic';

// Create the express app
const app: Express = express();
app.disable('x-powered-by');

initializeFirestoreClient(app);

// Define configurations
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Define routes
// Public routes (no JWT authentication required)
app.use('/router-service', RouterServiceRoutes);
app.use('/router-service', genericRouter);
app.use('/router-service', tiktokAuthRouter);
app.use('/router-service/webhook', WebhookRoutes);

// Protected routes (JWT authentication required)
app.use('/router-service/tiktok/products', jwtAuthMiddleware, tiktokProductRouter);
app.use('/router-service/tiktok/orders', jwtAuthMiddleware, tiktokOrderRouter);
app.use('/router-service/tiktok/categories', jwtAuthMiddleware, tiktokCategoryRouter);
app.use('/router-service/tiktok/inventory', jwtAuthMiddleware, tiktokInventoryRouter);
app.use('*', (req, res, next) => {
  throw new CustomError(404, 'Path not found.');
});
// Global error handler
app.use(errorMiddleware);

export default app;
