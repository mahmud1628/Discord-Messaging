const multer = require("multer");

const errorHandler = (err, _req, res, _next) => {
  if (err) {
    // eslint-disable-next-line no-console
    console.error('[ErrorHandler]', {
      message: err.message,
      statusCode: err.statusCode,
      code: err.code,
      stack: err.stack,
    });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File exceeds the 5MB limit",
      });
    }

    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Invalid file field. Use 'file' or 'attachments'",
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
  });
};

module.exports = errorHandler;
