import mongoose from 'mongoose';
import ensureDnsResolvers from './dns';

const connectDB = async () => {
  try {
    ensureDnsResolvers();
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/xchango');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
