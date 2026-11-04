import fs from 'fs';
import path from 'path';
import { PassThrough, Readable, Writable } from 'stream';
import {
  deleteStoredFile,
  discardUploadedFile,
  persistUploadedFiles,
  serveStoredFile,
  setBucketProviderForTests,
  storedNameFromPath,
  storedNameFromUrl,
  uploadsRoot,
} from './storedFiles';

interface StoredFile {
  _id: number;
  filename: string;
  length: number;
  uploadDate: Date;
  data: Buffer;
}

class FakeBucket {
  files: StoredFile[] = [];
  private nextId = 1;

  openUploadStream(filename: string) {
    const chunks: Buffer[] = [];
    return new Writable({
      write: (chunk, _enc, cb) => {
        chunks.push(Buffer.from(chunk));
        cb();
      },
      final: (cb) => {
        const data = Buffer.concat(chunks);
        this.files.push({ _id: this.nextId++, filename, length: data.length, uploadDate: new Date(), data });
        cb();
      },
    });
  }

  find(query: { filename: string }) {
    const matches = this.files.filter((file) => file.filename === query.filename);
    const cursor = {
      sort: () => cursor,
      limit: () => cursor,
      toArray: async () => matches,
    };
    return cursor;
  }

  openDownloadStream(id: number) {
    return Readable.from([this.files.find((file) => file._id === id)!.data]);
  }

  async delete(id: number) {
    this.files = this.files.filter((file) => file._id !== id);
  }
}

const makeRes = () => {
  const res: any = new PassThrough();
  res.headers = {} as Record<string, string>;
  res.headersSent = false;
  res.setHeader = (key: string, value: string) => {
    res.headers[key] = value;
  };
  res.type = (value: string) => {
    res.headers['Content-Type'] = value;
  };
  return res;
};

const collect = (res: PassThrough) =>
  new Promise<Buffer>((resolve) => {
    const chunks: Buffer[] = [];
    res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    res.on('end', () => resolve(Buffer.concat(chunks)));
  });

describe('stored files (GridFS)', () => {
  const folder = '__storedfiles-test__';
  const folderPath = path.join(uploadsRoot, folder);
  let bucket: FakeBucket;

  const writeTempUpload = (name: string, content: string) => {
    fs.mkdirSync(folderPath, { recursive: true });
    const filePath = path.join(folderPath, name);
    fs.writeFileSync(filePath, content);
    return {
      path: filePath,
      originalname: name,
      mimetype: 'application/pdf',
    } as Express.Multer.File;
  };

  beforeEach(() => {
    bucket = new FakeBucket();
    setBucketProviderForTests(() => bucket as never);
  });

  afterEach(() => {
    setBucketProviderForTests(null);
    fs.rmSync(folderPath, { recursive: true, force: true });
  });

  it('maps URLs and disk paths to the same stored name and rejects unsafe URLs', () => {
    expect(storedNameFromUrl('/uploads/documents/a.pdf')).toBe('documents/a.pdf');
    expect(storedNameFromPath(path.join(uploadsRoot, 'documents', 'a.pdf'))).toBe('documents/a.pdf');
    expect(storedNameFromUrl('https://example.com/a.pdf')).toBeNull();
    expect(storedNameFromUrl('/uploads/../secrets.txt')).toBeNull();
    expect(storedNameFromUrl('')).toBeNull();
  });

  it('copies an uploaded temp file into GridFS under <folder>/<file> and removes the temp file when the request closes', async () => {
    const file = writeTempUpload('transcript-1.pdf', 'hello pdf');
    const res = makeRes();
    const next = jest.fn();

    await persistUploadedFiles({ file } as never, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(bucket.files).toHaveLength(1);
    expect(bucket.files[0].filename).toBe(`${folder}/transcript-1.pdf`);
    expect(bucket.files[0].data.toString()).toBe('hello pdf');

    res.emit('close');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fs.existsSync(file.path)).toBe(false);
  });

  it('handles multiple files from req.files', async () => {
    const a = writeTempUpload('a.pdf', 'A');
    const b = writeTempUpload('b.pdf', 'B');
    const next = jest.fn();

    await persistUploadedFiles({ files: [a, b] } as never, makeRes(), next);

    expect(bucket.files.map((f) => f.data.toString()).sort()).toEqual(['A', 'B']);
    expect(next).toHaveBeenCalledWith();
  });

  it('passes through requests without a file', async () => {
    const next = jest.fn();
    await persistUploadedFiles({} as never, makeRes(), next);
    expect(next).toHaveBeenCalledWith();
    expect(bucket.files).toHaveLength(0);
  });

  it('streams a stored file back with its content type', async () => {
    const file = writeTempUpload('doc.pdf', 'stored bytes');
    await persistUploadedFiles({ file } as never, makeRes(), jest.fn());

    const res = makeRes();
    const body = collect(res);
    const next = jest.fn();
    await serveStoredFile({ params: { folder, name: 'doc.pdf' }, method: 'GET' } as never, res, next);

    expect((await body).toString()).toBe('stored bytes');
    expect(res.headers['Content-Type']).toBe('.pdf');
    expect(res.headers['Content-Length']).toBe(String('stored bytes'.length));
    expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
    expect(next).not.toHaveBeenCalled();
  });

  it('falls through to the next handler when the file is not in GridFS', async () => {
    const next = jest.fn();
    await serveStoredFile({ params: { folder, name: 'missing.pdf' }, method: 'GET' } as never, makeRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('deletes stored files by URL and ignores external URLs', async () => {
    const file = writeTempUpload('old.pdf', 'x');
    await persistUploadedFiles({ file } as never, makeRes(), jest.fn());
    expect(bucket.files).toHaveLength(1);

    await deleteStoredFile('https://example.com/other.pdf');
    expect(bucket.files).toHaveLength(1);

    await deleteStoredFile(`/uploads/${folder}/old.pdf`);
    expect(bucket.files).toHaveLength(0);
  });

  it('discards a rejected upload from disk and GridFS', async () => {
    const file = writeTempUpload('bad.pdf', 'x');
    await persistUploadedFiles({ file } as never, makeRes(), jest.fn());

    await discardUploadedFile(file);

    expect(bucket.files).toHaveLength(0);
    expect(fs.existsSync(file.path)).toBe(false);
  });
});
