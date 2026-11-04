import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import mongoose from 'mongoose';

type GridFSBucket = InstanceType<typeof mongoose.mongo.GridFSBucket>;

/**
 * Uploaded files live in MongoDB GridFS, not on the server disk (hosts such as Render
 * wipe the disk on every deploy). multer still writes each upload to a temporary disk
 * file so the parsers can read it by path; the middleware below copies it into GridFS
 * and the temp file is removed when the request ends.
 *
 * Public URLs stay `/uploads/<folder>/<file>`, and the GridFS filename is `<folder>/<file>`.
 */

export const uploadsRoot = path.resolve(__dirname, '../../uploads');
const BUCKET_NAME = 'uploads';
const URL_PREFIX = '/uploads/';

type BucketProvider = () => GridFSBucket;

const defaultBucketProvider: BucketProvider = () => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB is not connected yet; cannot access stored files.');
  }
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
};

let bucketProvider: BucketProvider = defaultBucketProvider;

/** Tests swap in an in-memory bucket. */
export const setBucketProviderForTests = (provider: BucketProvider | null) => {
  bucketProvider = provider ?? defaultBucketProvider;
};

const getBucket = () => bucketProvider();

/** `<folder>/<file>` for a file on disk under the uploads root. */
export const storedNameFromPath = (filePath: string) =>
  path.relative(uploadsRoot, path.resolve(filePath)).split(path.sep).join('/');

/** `<folder>/<file>` for a `/uploads/...` URL, or null for anything else (e.g. external links). */
export const storedNameFromUrl = (fileUrl: string | undefined | null): string | null => {
  if (!fileUrl || !fileUrl.startsWith(URL_PREFIX)) return null;
  const name = fileUrl.slice(URL_PREFIX.length);
  return name && !name.split('/').includes('..') ? name : null;
};

const flattenUploadedFiles = (req: Request): Express.Multer.File[] => {
  const files: Express.Multer.File[] = [];
  if (req.file) files.push(req.file);
  const many = req.files as Express.Multer.File[] | Record<string, Express.Multer.File[]> | undefined;
  if (Array.isArray(many)) files.push(...many);
  else if (many) Object.values(many).forEach((group) => files.push(...group));
  return files;
};

const deleteByName = async (name: string) => {
  const bucket = getBucket();
  const matches = await bucket.find({ filename: name }).toArray();
  await Promise.all(matches.map((file) => bucket.delete(file._id).catch(() => undefined)));
};

/** Copies multer's temp files into GridFS and removes the temp files once the request ends. */
export const persistUploadedFiles: RequestHandler = async (req, res, next) => {
  const files = flattenUploadedFiles(req);
  if (!files.length) return next();

  res.once('close', () => {
    files.forEach((file) => void fsp.unlink(file.path).catch(() => undefined));
  });

  try {
    const bucket = getBucket();
    for (const file of files) {
      const target = bucket.openUploadStream(storedNameFromPath(file.path), {
        metadata: { contentType: file.mimetype, originalName: file.originalname },
      });
      await pipeline(fs.createReadStream(file.path), target);
    }
    next();
  } catch (error) {
    next(error);
  }
};

/** Removes an upload that was rejected after it had already been stored (temp file and GridFS copy). */
export const discardUploadedFile = async (file: Express.Multer.File | undefined) => {
  if (!file) return;
  await fsp.unlink(file.path).catch(() => undefined);
  await deleteByName(storedNameFromPath(file.path)).catch(() => undefined);
};

/** Deletes the stored copy for a `/uploads/...` URL, plus any legacy copy left on disk. */
export const deleteStoredFile = async (fileUrl: string | undefined | null) => {
  const name = storedNameFromUrl(fileUrl);
  if (!name) return;
  await deleteByName(name).catch(() => undefined);
  const legacyPath = path.resolve(uploadsRoot, name);
  if (legacyPath.startsWith(uploadsRoot + path.sep)) {
    await fsp.unlink(legacyPath).catch(() => undefined);
  }
};

/** GET /uploads/:folder/:name. Falls through to the disk-based static handler for legacy files. */
export const serveStoredFile: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = `${req.params.folder}/${req.params.name}`;
    const bucket = getBucket();
    const [file] = await bucket.find({ filename: name }).sort({ uploadDate: -1 }).limit(1).toArray();
    if (!file) return next();

    res.type(path.extname(String(req.params.name)) || 'application/octet-stream');
    res.setHeader('Content-Length', String(file.length));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600');

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    await pipeline(bucket.openDownloadStream(file._id), res);
  } catch (error) {
    if (!res.headersSent) next(error);
  }
};
