const express = require('express');
const healthRouter = require('./health.routes');
const messageRoutes = require('./message.routes');
const apiRouter = express.Router();

apiRouter.use('/health', healthRouter);
apiRouter.use("/servers",messageRoutes);


module.exports = apiRouter;
