const express = require('express');
const healthRouter = require('./health.routes');
const serverRoutes = require('./server.routes');
const apiRouter = express.Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/servers', serverRoutes);


module.exports = apiRouter;
