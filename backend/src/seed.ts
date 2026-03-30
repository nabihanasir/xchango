import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User, { UserRole } from './models/User';
import Country from './models/Country';
import University from './models/University';
import Application, { ApplicationStatus } from './models/Application';
import StudentProfile from './models/StudentProfile';
import bcrypt from 'bcryptjs';

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/xchango');
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Country.deleteMany({});
    await University.deleteMany({});
    await Application.deleteMany({});
    await StudentProfile.deleteMany({});

    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('password123', salt);

    // Create Admin
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@xchango.com',
      password,
      role: UserRole.ADMIN,
      isActive: true,
    });

    // Create Advisor
    const advisor = await User.create({
      name: 'Advisor One',
      email: 'advisor@xchango.com',
      password,
      role: UserRole.ADVISOR,
      isActive: true,
    });

    // Create Students
    const student1 = await User.create({
      name: 'Nabiha Nasir',
      email: 'student@xchango.com',
      password,
      role: UserRole.STUDENT,
      isActive: true,
    });

    // Create StudentProfile
    await StudentProfile.create({
      userId: student1._id,
      registrationNumber: '49141',
      program: 'BS Computer Science',
      semester: '6th',
      cgpa: 3.8,
    });

    const student2 = await User.create({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password,
      role: UserRole.STUDENT,
      isActive: true,
    });

    await StudentProfile.create({
      userId: student2._id,
      registrationNumber: '48220',
      program: 'BS Business Administration',
      semester: '4th',
      cgpa: 3.5,
    });

    // Create Countries
    const sk = await Country.create({
      name: 'South Korea',
      code: 'KR',
    });

    const malaysia = await Country.create({
      name: 'Malaysia',
      code: 'MY',
    });

    // Create Universities
    const snu = await University.create({
      name: 'Seoul National University',
      countryId: sk._id,
      website: 'https://www.snu.ac.kr',
      seatLimit: 30,
    });

    const um = await University.create({
      name: 'University of Malaya',
      countryId: malaysia._id,
      website: 'https://www.um.edu.my',
      seatLimit: 40,
    });

    // Create Applications
    await Application.create({
      studentId: student1._id,
      selectedCountry: sk._id,
      selectedUniversity: snu._id,
      status: ApplicationStatus.APPROVED,
      intake: 'Fall 2026',
    });

    await Application.create({
      studentId: student2._id,
      selectedCountry: malaysia._id,
      selectedUniversity: um._id,
      status: ApplicationStatus.SUBMITTED,
      intake: 'Spring 2026',
    });

    console.log('Data Seeded Successfully with Alignment and expanded scope!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
};

seed();
