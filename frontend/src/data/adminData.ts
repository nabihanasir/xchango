export const adminStats = [
  { title: 'Total Users', value: '2,840', icon: 'users', trend: '+12%', color: 'blue' },
  { title: 'Total Applications', value: '1,250', icon: 'file-text', trend: '+5%', color: 'yellow' },
  { title: 'Approved', value: '840', icon: 'check-circle', trend: '+18%', color: 'green' },
  { title: 'Pending', value: '120', icon: 'clock', trend: '-2%', color: 'purple' },
];

export const countryData = [
  { name: 'S. Korea', applications: 400 },
  { name: 'Malaysia', applications: 300 },
  { name: 'Turkiye', applications: 200 },
  { name: 'UK', applications: 150 },
  { name: 'Germany', applications: 120 },
  { name: 'Others', applications: 80 },
];

export const monthlyTrend = [
  { month: 'Jan', apps: 65 },
  { month: 'Feb', apps: 85 },
  { month: 'Mar', apps: 120 },
  { month: 'Apr', apps: 110 },
  { month: 'May', apps: 160 },
  { month: 'Jun', apps: 140 },
  { month: 'Jul', apps: 210 },
];

export const recentUsers = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Student', status: 'active', joined: '2024-03-01' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Student', status: 'pending', joined: '2024-03-05' },
  { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', role: 'Staff', status: 'active', joined: '2024-02-28' },
];

export const recentApplications = [
  { 
    id: 101, 
    student: 'Nabiha Nasir', 
    university: 'Seoul National University', 
    program: 'Software Engineering', 
    status: 'approved', 
    date: '2024-03-12',
    details: {
      age: 21,
      sapId: '49141',
      semester: 6,
      cgpa: 3.90,
      countryOfChoice: 'South Korea',
      contactNo: '+92 300 1234567',
      email: 'nabiha.nasir@example.com',
      currentStage: 4,
      transcript: [
        {
          semester: 1,
          sgpa: 4.0,
          credits: 16,
          courses: [
            { name: 'IICT', grade: 'A+', credits: 3 },
            { name: 'Discrete structure', grade: 'A', credits: 3 },
            { name: 'Applied Physics', grade: 'A+', credits: 3 },
            { name: 'English Composition', grade: 'A+', credits: 3 },
            { name: 'Programming Fundamentals', grade: 'A+', credits: 4 },
          ]
        },
        {
          semester: 2,
          sgpa: 3.9,
          credits: 18,
          courses: [
            { name: 'Software Engineering', grade: 'A', credits: 3 },
            { name: 'Object Oriented Programming', grade: 'A+', credits: 4 },
            { name: 'Calculus & Analytical Geometry', grade: 'A+', credits: 3 },
            { name: 'Presentation Skills', grade: 'A+', credits: 3 },
            { name: 'Graphics and Animation', grade: 'B', credits: 3 },
            { name: 'Pakistan Studies', grade: 'A+', credits: 2 },
          ]
        }
      ]
    }
  },
  { 
    id: 102, 
    student: 'Alice Johnson', 
    university: 'University of Malaya', 
    program: 'Business Administration', 
    status: 'pending', 
    date: '2024-03-14',
    details: {
      age: 22,
      sapId: '48220',
      semester: 4,
      cgpa: 3.75,
      countryOfChoice: 'Malaysia',
      contactNo: '+92 321 7654321',
      email: 'alice.johnson@example.com',
      currentStage: 3,
      transcript: []
    }
  },
];
