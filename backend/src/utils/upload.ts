import fs from 'fs';
import multer from 'multer';
import path from 'path';

export const uploadsRoot = path.resolve(__dirname, '../../uploads');

const ensureDirectory = (directory: string) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  return directory;
};

const createStorage = (folderName: string) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, ensureDirectory(path.join(uploadsRoot, folderName)));
    },
    filename: (_req, file, cb) => {
      const safeBaseName = path
        .basename(file.originalname, path.extname(file.originalname))
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .slice(0, 60);

      cb(null, `${safeBaseName || file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    },
  });

export const createUploader = (folderName: string, allowedExtensions?: string[]) =>
  multer({
    storage: createStorage(folderName),
    fileFilter: (_req, file, cb) => {
      if (!allowedExtensions?.length) {
        cb(null, true);
        return;
      }

      const extension = path.extname(file.originalname).toLowerCase();
      if (!allowedExtensions.includes(extension)) {
        cb(new Error(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`));
        return;
      }

      cb(null, true);
    },
  });

export const toPublicFileUrl = (filePath: string) => {
  const relativePath = path.relative(uploadsRoot, path.resolve(filePath)).split(path.sep).join('/');
  return `/uploads/${relativePath}`;
};

const upload = createUploader('documents');

export const transcriptUpload = createUploader('transcripts', ['.xlsx', '.xls', '.csv']);
export const documentUpload = createUploader('documents');

export default upload;
