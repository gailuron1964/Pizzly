/*
 * Copyright (c) 2022 Nango, all rights reserved.
 */

import './config.js';
import express from 'express';
import logger from './utils/logger.js';
import db from './db/database.js';
import oauthController from './controllers/oauth.contoller.js';
import configController from './controllers/config.controller.js';
import connectionController from './controllers/connection.controller.js';
import { getOauthCallbackUrl, getPort } from './utils/utils.js';
import cors from 'cors';
import accessMiddleware from './access.middleware.js';

await db.knex.raw(`CREATE SCHEMA IF NOT EXISTS ${db.schema()}`);
await db.migrate(process.env['PIZZLY_DB_MIGRATION_FOLDER'] || './lib/db/migrations');

let port = getPort();
let callbackUrl = getOauthCallbackUrl();

let app = express();
app.use(express.json());
app.use(cors());

app.route('/oauth/connect/:providerConfigKey').get(accessMiddleware.checkPkey.bind(accessMiddleware), oauthController.oauthRequest.bind(oauthController));
app.route('/oauth/callback').get(oauthController.oauthCallback.bind(oauthController));

app.route('/config').get(accessMiddleware.checkSecret.bind(accessMiddleware), configController.listProviderConfigs.bind(configController));
app.route('/config/:providerConfigKey').get(accessMiddleware.checkSecret.bind(accessMiddleware), configController.getProviderConfig.bind(configController));
app.route('/config').post(accessMiddleware.checkSecret.bind(accessMiddleware), configController.createProviderConfig.bind(configController));
app.route('/config').put(accessMiddleware.checkSecret.bind(accessMiddleware), configController.editProviderConfig.bind(configController));
app.route('/config/:providerConfigKey').delete(
    accessMiddleware.checkSecret.bind(accessMiddleware),
    configController.deleteProviderConfig.bind(configController)
);

app.route('/connection/:connectionId').get(
    accessMiddleware.checkSecret.bind(accessMiddleware),
    connectionController.getConnectionCreds.bind(connectionController)
);

app.use((error: any, _: express.Request, response: express.Response, __: express.NextFunction) => {
    logger.error(error);
    const status = error.status || 500;
    response.status(status).send(error.message);
});

app.listen(port, () => {
    logger.info(`✅ Pizzly Server is listening on port ${port}. OAuth callback URL: ${callbackUrl}`);
});
