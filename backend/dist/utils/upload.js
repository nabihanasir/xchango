"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentUpload = exports.transcriptUpload = exports.toPublicFileUrl = exports.createUploader = exports.uploadsRoot = void 0;
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
exports.uploadsRoot = path_1.default.resolve(__dirname, '../../uploads');
const ensureDirectory = (directory) => {
    if (!fs_1.default.existsSync(directory)) {
        fs_1.default.mkdirSync(directory, { recursive: true });
    }
    return directory;
};
const createStorage = (folderName) => multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, ensureDirectory(path_1.default.join(exports.uploadsRoot, folderName)));
    },
    filename: (_req, file, cb) => {
        const safeBaseName = path_1.default
            .basename(file.originalname, path_1.default.extname(file.originalname))
            .replace(/[^a-zA-Z0-9-_]/g, '-')
            .slice(0, 60);
        cb(null, `${safeBaseName || file.fieldname}-${Date.now()}${path_1.default.extname(file.originalname)}`);
    },
});
const createUploader = (folderName, allowedExtensions) => (0, multer_1.default)({
    storage: createStorage(folderName),
    fileFilter: (_req, file, cb) => {
        if (!allowedExtensions?.length) {
            cb(null, true);
            return;
        }
        const extension = path_1.default.extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(extension)) {
            cb(new Error(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`));
            return;
        }
        cb(null, true);
    },
});
exports.createUploader = createUploader;
const toPublicFileUrl = (filePath) => {
    const relativePath = path_1.default.relative(exports.uploadsRoot, path_1.default.resolve(filePath)).split(path_1.default.sep).join('/');
    return `/uploads/${relativePath}`;
};
exports.toPublicFileUrl = toPublicFileUrl;
const upload = (0, exports.createUploader)('documents');
exports.transcriptUpload = (0, exports.createUploader)('transcripts', ['.xlsx', '.xls', '.csv']);
exports.documentUpload = (0, exports.createUploader)('documents');
exports.default = upload;
