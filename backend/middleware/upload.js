const multer = require('multer');
const path = require('path');
const fs = require('fs');

let storage;

// Use Cloudinary if credentials are provided; otherwise fall back to local disk storage
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  const cloudinary = require('cloudinary').v2;

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder:          'durgas_products',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      public_id:       (req, file) => `durgas_${Date.now()}_${Math.round(Math.random() * 1e9)}`,
    },
  });
} else {
  // Local disk fallback
  const uploadDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename:    (req, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase();
      const name = `durgas_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, name);
    },
  });
}

// File type filter — only allow safe image types by MIME type
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits:     { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
  fileFilter,
});

module.exports = upload;
