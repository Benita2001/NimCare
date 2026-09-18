import { Router } from 'express';
import multer from 'multer';
import { put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
import { requireSession } from './auth.js';
import { asyncHandler } from '../asyncHandler.js';

export const mediaRouter = Router();

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error('unsupported_media_type'));
      return;
    }
    cb(null, true);
  },
});

/**
 * Accepts exactly one photo (JPEG/PNG/WebP, <=8MB) and stores it in Vercel
 * Blob. No arbitrary HTML/SVG is accepted — fileFilter rejects anything
 * outside the three allowed raster image types before it ever reaches
 * storage. The uploader is responsible for owning the rights to the photo
 * (see PRIVACY.md) — NimCare does not verify provenance.
 */
mediaRouter.post(
  '/photo',
  requireSession,
  (req, res, next) => {
    upload.single('photo')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message === 'unsupported_media_type' ? 'unsupported_media_type' : 'upload_failed' });
      next();
    });
  },
  asyncHandler(async (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'missing_file' });

    const ext = req.file.mimetype === 'image/png' ? 'png' : req.file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const pathname = `caredrops/${req.walletAddress.replace(/\s+/g, '')}/${randomUUID()}.${ext}`;

    const blob = await put(pathname, req.file.buffer, {
      access: 'public',
      contentType: req.file.mimetype,
    });

    res.json({ url: blob.url, mime: req.file.mimetype });
  }),
);
