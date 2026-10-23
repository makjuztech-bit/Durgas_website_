const multer = require('multer');
const path = require('path');
const fs = require('fs');

let storage;

// Use Cloudinary for permanent CDN storage; fall back to local disk storage if Cloudinary fails
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  const cloudinary = require('cloudinary').v2;

  cloudinary.config({
    cloud_name: cloudName,
    api_key:    apiKey,
    api_secret: apiSecret,
  });

  storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const rawExt = path.extname(file.originalname || '').replace('.', '').toLowerCase();
      const format = ['jpg', 'jpeg', 'png', 'webp'].includes(rawExt) ? rawExt : 'jpg';
      return {
        folder: 'durgas_products',
        format,
        public_id: `durgas_${Date.now()}_${Math.round(Math.random() * 1e9)}`,
      };
    },
  });
} else {
  // Local disk fallback
  const uploadDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename:    (req, file, cb) => {
      const ext  = (path.extname(file.originalname) || '.jpg').toLowerCase();
      const name = `durgas_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, name);
    },
  });
}

// File type filter — allow all common image types and extensions
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.jfif', '.bmp', '.gif', '.avif'];
  const isImageMime = (file.mimetype || '').toLowerCase().startsWith('image/');

  if (isImageMime || validExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, WebP) are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits:     { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter,
});

module.exports = upload;
