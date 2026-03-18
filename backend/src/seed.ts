import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User, { UserRole, UserStatus } from './models/User';
import Country from './models/Country';
import University from './models/University';
import Application, { ApplicationStatus } from './models/Application';
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

    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('password123', salt);

    // Create Admin
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@xchango.com',
      password,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });

    // Create Advisor
    const advisor = await User.create({
      firstName: 'Advisor',
      lastName: 'One',
      email: 'advisor@xchango.com',
      password,
      role: UserRole.ADVISOR,
      status: UserStatus.ACTIVE,
    });

    // Create Students
    const student1 = await User.create({
      firstName: 'Nabiha',
      lastName: 'Nasir',
      email: 'student@xchango.com',
      password,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
    });

    const student2 = await User.create({
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@example.com',
      password,
      role: UserRole.STUDENT,
      status: UserStatus.PENDING,
    });

    // Create Countries
    const sk = await Country.create({
      name: 'South Korea',
      code: 'KR',
      currency: 'KRW',
      visaRequirements: 'D-2 Visa required.',
    });

    const malaysia = await Country.create({
      name: 'Malaysia',
      code: 'MY',
      currency: 'MYR',
      visaRequirements: 'Student Pass required.',
    });

    const turkey = await Country.create({
      name: 'Turkiye',
      code: 'TR',
      currency: 'TRY',
      visaRequirements: 'Student visa required.',
    });

    // Create Universities
    const snu = await University.create({
      name: 'Seoul National University',
      country: sk._id,
      location: 'Seoul',
      description: 'The first national university of Korea.',
      website: 'https://www.snu.ac.kr',
      applicationDeadline: new Date('2026-05-30'),
      totalSeats: 30,
      availableSeats: 30,
      requirements: ['GPA > 3.5'],
    });

    const um = await University.create({
      name: 'University of Malaya',
      country: malaysia._id,
      location: 'Kuala Lumpur',
      description: 'The oldest university in Malaysia.',
      website: 'https://www.um.edu.my',
      applicationDeadline: new Date('2026-06-15'),
      totalSeats: 40,
      availableSeats: 40,
      requirements: ['GPA > 3.0'],
    });

    // Create Applications
    await Application.create({
      student: student1._id,
      university: snu._id,
      advisor: advisor._id,
      program: 'Software Engineering',
      sapId: '49141',
      semester: '6th',
      universityEmail: 'student@university.edu',
      travelHistory: 'None',
      passportStatus: 'Valid',
      financialEligibility: true,
      degreeExtension: true,
      status: ApplicationStatus.APPROVED,
    });

    await Application.create({
      student: student2._id,
      university: um._id,
      program: 'Business Administration',
      sapId: '48220',
      semester: '4th',
      universityEmail: 'alice@university.edu',
      travelHistory: 'Visited UK in 2022',
      passportStatus: 'Valid',
      financialEligibility: true,
      degreeExtension: false,
      status: ApplicationStatus.PENDING,
    });

    console.log('Data Seeded Successfully with Alignment!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
};

seed();
