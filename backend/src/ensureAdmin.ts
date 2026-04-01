import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User, { UserRole } from './models/User';

dotenv.config();

const ADMIN_EMAIL = 'admin@xchango.com';
const ADMIN_PASSWORD = 'Admin@123';
const ADMIN_NAME = 'System Admin';
const ADMIN_PHONE = '+92-300-0000001';
const ADMIN_SAP_ID = 'ADM0001';

const ensureAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/xchango');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

    const admin = await User.findOneAndUpdate(
      { email: ADMIN_EMAIL },
      {
        $set: {
          name: ADMIN_NAME,
          email: ADMIN_EMAIL,
          password: hashedPassword,
          role: UserRole.ADMIN,
          phone: ADMIN_PHONE,
          sapId: ADMIN_SAP_ID,
          isActive: true,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
      }
    );

    console.log('Admin user is ready.');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log(`User ID: ${admin._id.toString()}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Failed to ensure admin user:', error);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
  }
};

void ensureAdmin();
