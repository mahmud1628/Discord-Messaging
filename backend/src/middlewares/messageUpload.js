const multer = require("multer");

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const fileFilter = (_req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    const error = new Error(`Unsupported file type: ${file.mimetype}`);
    error.statusCode = 400;
    return cb(error);
  }

  return cb(null, true);
};

const uploadMessageAttachments = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter,
});

module.exports = {
  uploadMessageAttachments,
  MAX_FILE_SIZE_BYTES,
};