import { Router } from 'express';
import { logger } from '../utils/logger.utils';
import { renderErrorPage } from '../utils/html.utils';
import { authorizeApp , authorizeProject, refreshJwt} from '../controllers/app-map.controller';

const serviceRouter = Router();

/**
 * Gets called by the TikTok app to authorize the app
 */
serviceRouter.get('/authorize-app', async (req, res, next) => {
  await authorizeApp(req, res).catch((error) => {
    logger.error('Error authorizing app', error);
    const html = renderErrorPage(error.message, 500, 'Authorization Failed');
    return res.status(500).type('html').send(html);
  });
});

/**
 * Gets called by the MC app to authorize the project
 */
serviceRouter.post('/authorize-project', async (req, res, next) => {
  await authorizeProject(req, res).catch((error) => {
    logger.error('Error authorizing app', error);
    const html = renderErrorPage(error.message, 500, 'Project Authorization Failed');
    return res.status(500).type('html').send(html);
  });
});

/**
 * Refresh JWT token endpoint
 * Accepts existing JWT in Authorization header and issues a new one
 */
serviceRouter.post('/refresh-jwt', async (req, res, next) => {
  await refreshJwt(req, res).catch((error) => {
    logger.error('Error refreshing JWT', error);
    return res.status(401).send(error.message);
  });
});

export default serviceRouter;
