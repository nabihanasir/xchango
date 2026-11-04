/**
 * One-time copy of files from backend/uploads (local disk) into MongoDB GridFS.
 *
 *   npm run migrate-uploads            # dry run: lists what would be copied
 *   npm run migrate-uploads -- --apply # actually copies (writes to the database in MONGO_URI)
 *
 * Safe to re-run: files already in GridFS (same <folder>/<file> name) are skipped.
 */
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ensureDnsResolvers from './config/dns';
import { uploadsRoot } from './utils/storedFiles';

dotenv.config();

const APPLY = process.argv.includes('--apply');

const listLocalFiles = (): string[] => {
  if (!fs.existsSync(uploadsRoot)) return [];
  return fs
    .readdirSync(uploadsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((folder) =>
      fs
        .readdirSync(path.join(uploadsRoot, folder.name), { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => `${folder.name}/${entry.name}`)
    );
};

const run = async () => {
  ensureDnsResolvers();
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/xchango');
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database connection is not ready.');
  const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });

  console.log(`Database: ${mongoose.connection.host}/${mongoose.connection.name}`);
  console.log(APPLY ? 'Mode: APPLY (copying files)' : 'Mode: DRY RUN (add --apply to copy)');

  let copied = 0;
  let skipped = 0;
  for (const name of listLocalFiles()) {
    const existing = await bucket.find({ filename: name }).limit(1).toArray();
    if (existing.length) {
      skipped += 1;
      console.log(`skip   ${name} (already in GridFS)`);
      continue;
    }
    console.log(`${APPLY ? 'copy  ' : 'would '} ${name}`);
    if (APPLY) {
      await pipeline(fs.createReadStream(path.join(uploadsRoot, name)), bucket.openUploadStream(name));
    }
    copied += 1;
  }

  console.log(`\n${APPLY ? 'Copied' : 'Would copy'}: ${copied}, already stored: ${skipped}`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(`Migration failed: ${error.message}`);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
