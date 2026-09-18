/**
 * middleware/uploadGrantDocument.js
 *
 * File upload handling for Grant Call-specific PDF documents (e.g. guidelines).
 * PDF only, max 10 MB, stored on local disk under Backend/uploads/grant-documents.
 *
 * This is a distinct feature from the previously removed agency Verification
 * Document upload — it is scoped per Grant Call, not per agency, and is
 * viewable on the Grant Details page rather than feeding an admin approval
 * workflow.
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'grant-documents');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const programId = req.params.id || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, `${programId}-${timestamp}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const isPdf =
    file.mimetype === 'application/pdf' && path.extname(file.originalname).toLowerCase() === '.pdf';
  if (!isPdf) {
    return cb(new Error('Only PDF files are accepted'));
  }
  cb(null, true);
};

const uploadGrantDoc = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

module.exports = { uploadGrantDoc };