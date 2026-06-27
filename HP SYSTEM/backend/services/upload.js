const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const UPLOADS_DIR = process.env.UPLOADS_DIR || "uploads";

const getUploadPath = () => {
  return path.resolve(process.cwd(), UPLOADS_DIR);
};

const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .substring(0, 255);
};

const generateUniqueFilename = (originalname) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString("hex");
  const extension = path.extname(originalname).toLowerCase();
  const sanitizedName = sanitizeFilename(
    path.basename(originalname, extension)
  );
  return `${sanitizedName}_${timestamp}_${randomString}${extension}`;
};

const imageFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(", ")}`
      ),
      false
    );
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = getUploadPath();
    console.log(`Uploading to: ${uploadPath}`);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = generateUniqueFilename(file.originalname);
    console.log(`Generated filename: ${uniqueFilename}`);
    cb(null, uniqueFilename);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size too large. Maximum size is 5MB.",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Only 1 file allowed.",
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${error.message}`,
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "An error occurred during file upload",
    });
  }

  next();
};

const uploadSingleImage = upload.single("image");

module.exports = {
  upload,
  uploadSingleImage,
  handleUploadError,
  getUploadPath,
  generateUniqueFilename,
};
