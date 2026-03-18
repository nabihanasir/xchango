import University from '../models/University';
import Course from '../models/Course';
import Application from '../models/Application';
import User from '../models/User';
import Country from '../models/Country';

export const getAllStats = async () => {
  const studentCount = await User.countDocuments({ role: 'student' });
  const applicationCount = await Application.countDocuments();
  const approvedCount = await Application.countDocuments({ status: 'approved' });
  const pendingCount = await Application.countDocuments({ status: 'pending' });

  // Dashboard Stats matching frontend adminStats
  const adminStats = [
    { title: 'Total Users', value: studentCount.toString(), icon: 'users', trend: '+0%', color: 'blue' },
    { title: 'Total Applications', value: applicationCount.toString(), icon: 'file-text', trend: '+0%', color: 'yellow' },
    { title: 'Approved', value: approvedCount.toString(), icon: 'check-circle', trend: '+0%', color: 'green' },
    { title: 'Pending', value: pendingCount.toString(), icon: 'clock', trend: '+0%', color: 'purple' },
  ];

  // Applications per Country matching frontend countryData
  const countries = await Country.find();
  const countryData = await Promise.all(
    countries.map(async (c) => {
      const apps = await Application.countDocuments({ university: { $in: await University.find({ country: c._id }).distinct('_id') } });
      return { name: c.name, applications: apps };
    })
  );

  // Monthly Trend matching frontend monthlyTrend
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  const monthlyTrend = months.map((month) => ({ month, apps: 0 })); // In a real app, this would be aggregated from DB

  return {
    adminStats,
    countryData,
    monthlyTrend,
  };
};

export const createUniversity = async (universityData: any) => {
  return await University.create(universityData);
};

export const createCourse = async (courseData: any) => {
  return await Course.create(courseData);
};

export const getAllUsers = async () => {
  return await User.find().select('-password');
};
