import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ensureDnsResolvers from './config/dns';
import University from './models/University';
import User from './models/User';
import Course, { CourseType } from './models/Course';

dotenv.config();

/** Home course instructors are notified when an exchange student arrives. Host instructors need no email. */
const HOME_INSTRUCTOR_EMAIL = 'nabiha.nasirr@gmail.com';

/**
 * Adds home and host courses with weekly outlines. Safe to re-run and safe on a database that already has
 * data: nothing is deleted, and anything that already exists (matched by code) is left exactly as it is.
 */

interface CourseSeed {
  code: string;
  title: string;
  creditHours: number;
  description: string;
  topics: string[];
}

/** A host course either lists its own weekly topics or reuses (a shortened copy of) a home course's topics. */
interface HostCourseSeed extends Omit<CourseSeed, 'topics'> {
  topics?: string[];
  basedOn?: string;
}

/** Host universities are looked up by name in the database; they are never created here. */
interface HostUniversitySeed {
  name: string;
  courses: HostCourseSeed[];
}

const toOutline = (topics: string[]) => topics.map((topic, index) => `Week ${index + 1}: ${topic}`).join('\n');

const HOME_COURSES: CourseSeed[] = [
  {
    code: 'CS1002',
    title: 'Programming Fundamentals',
    creditHours: 3,
    description: 'Introduction to problem solving and structured programming.',
    topics: [
      'Introduction to computing, algorithms and flowcharts',
      'Variables, data types, operators and expressions',
      'Selection statements: if, else, switch',
      'Loops: while, do-while, for, nested loops',
      'Functions, parameters, return values and scope',
      'Recursion basics',
      'One-dimensional arrays and searching',
      'Sorting arrays: bubble, selection, insertion',
      'Two-dimensional arrays',
      'Strings and character handling',
      'Pointers and dynamic memory',
      'Structures and enumerations',
      'File input and output',
      'Debugging, testing and coding style',
    ],
  },
  {
    code: 'CS2005',
    title: 'Data Structures and Algorithms',
    creditHours: 3,
    description: 'Core data structures and asymptotic analysis for problem solving.',
    topics: [
      'Algorithm analysis, Big-O, Omega and Theta notation',
      'Arrays, dynamic arrays and amortized analysis',
      'Singly, doubly and circular linked lists',
      'Stacks and queues, expression evaluation',
      'Recursion and divide and conquer',
      'Sorting: merge sort, quick sort, heap sort',
      'Binary trees and tree traversals',
      'Binary search trees and AVL trees',
      'Heaps and priority queues',
      'Hash tables, collision handling and hashing functions',
      'Graphs: representation, BFS and DFS',
      'Shortest paths: Dijkstra and Bellman-Ford',
      'Minimum spanning trees: Prim and Kruskal',
      'Greedy algorithms and dynamic programming introduction',
    ],
  },
  {
    code: 'CS2006',
    title: 'Operating Systems',
    creditHours: 3,
    description: 'Processes, memory, storage and concurrency in modern operating systems.',
    topics: [
      'Operating system structure and system calls',
      'Processes, process states and context switching',
      'Threads and multithreading models',
      'CPU scheduling: FCFS, SJF, round robin, priority',
      'Process synchronization, critical sections and semaphores',
      'Classical synchronization problems and monitors',
      'Deadlocks: detection, prevention and avoidance',
      'Main memory management, paging and segmentation',
      'Virtual memory and page replacement algorithms',
      'File systems, directories and allocation methods',
      'Disk scheduling and RAID',
      'I/O systems and device drivers',
      'Protection, security and access control',
      'Case study: Linux process and memory management',
    ],
  },
  {
    code: 'CS3001',
    title: 'Computer Networks',
    creditHours: 3,
    description: 'Layered network architecture, protocols and network programming.',
    topics: [
      'Network models: OSI and TCP/IP, switching and delays',
      'Application layer: HTTP, DNS, email, FTP',
      'Socket programming with TCP and UDP',
      'Transport layer principles and reliable data transfer',
      'TCP connection management and flow control',
      'TCP congestion control',
      'Network layer: IPv4 addressing, subnetting, NAT',
      'IPv6 and ICMP',
      'Routing algorithms: link state and distance vector',
      'Routing protocols: OSPF, RIP and BGP',
      'Link layer, error detection and correction',
      'Multiple access protocols, Ethernet and switches',
      'Wireless networks and mobility',
      'Network security basics: TLS, firewalls and VPNs',
    ],
  },
  {
    code: 'CS3007',
    title: 'Database Management Systems',
    creditHours: 3,
    description: 'Relational databases, query languages, and transaction management.',
    topics: [
      'Database concepts, architecture and data models',
      'Entity-relationship modelling',
      'Relational model and relational algebra',
      'SQL: queries, joins and aggregation',
      'SQL: subqueries, views, constraints and triggers',
      'Functional dependencies and normalization (1NF to BCNF)',
      'Storage structures and file organization',
      'Indexing: B+ trees and hash indexes',
      'Query processing and optimization',
      'Transactions and ACID properties',
      'Concurrency control: locking and timestamps',
      'Recovery: logging and checkpoints',
      'NoSQL databases and distributed data',
      'Database security and administration',
    ],
  },
  {
    code: 'CS3009',
    title: 'Software Engineering',
    creditHours: 3,
    description: 'Software processes, requirements, design, testing and project management.',
    topics: [
      'Software process models: waterfall, iterative, agile',
      'Requirements elicitation and specification',
      'Use cases, user stories and requirements validation',
      'Agile methods: Scrum and Kanban',
      'System modelling with UML',
      'Software architecture and design patterns',
      'Object-oriented design principles (SOLID)',
      'Implementation, version control and code review',
      'Software testing: unit, integration and system',
      'Test-driven development and automation',
      'Software quality, metrics and maintenance',
      'Project planning, estimation and risk management',
      'DevOps, continuous integration and delivery',
      'Software ethics and professional practice',
    ],
  },
  {
    code: 'CS4001',
    title: 'Artificial Intelligence',
    creditHours: 3,
    description: 'Search, knowledge representation, reasoning and introductory machine learning.',
    topics: [
      'Introduction to AI and intelligent agents',
      'Uninformed search: BFS, DFS, uniform cost',
      'Informed search: greedy best-first and A*',
      'Local search and optimization, genetic algorithms',
      'Adversarial search: minimax and alpha-beta pruning',
      'Constraint satisfaction problems',
      'Propositional and first-order logic',
      'Inference and resolution',
      'Probabilistic reasoning and Bayesian networks',
      'Supervised learning: regression and classification',
      'Decision trees and evaluation metrics',
      'Neural networks and backpropagation',
      'Unsupervised learning: clustering',
      'Natural language processing and AI ethics',
    ],
  },
  {
    code: 'MT1004',
    title: 'Linear Algebra',
    creditHours: 3,
    description: 'Matrices, vector spaces, linear transformations and eigenvalues.',
    topics: [
      'Systems of linear equations and Gaussian elimination',
      'Matrix operations and inverses',
      'Determinants and their properties',
      'Vectors in R^n, dot and cross products',
      'Vector spaces and subspaces',
      'Linear independence, basis and dimension',
      'Row space, column space and null space',
      'Linear transformations and their matrices',
      'Inner product spaces and orthogonality',
      'Gram-Schmidt process and QR factorization',
      'Eigenvalues and eigenvectors',
      'Diagonalization',
      'Symmetric matrices and quadratic forms',
      'Singular value decomposition and applications',
    ],
  },
];

const HOST_UNIVERSITIES: HostUniversitySeed[] = [
  {
    name: 'Kyungdong University (KDU Global)',
    courses: [
      { code: 'KDU-CS101', title: 'Programming Fundamentals', creditHours: 3, description: 'Structured programming and problem solving for first-year students.', basedOn: 'CS1002' },
      { code: 'KDU-CS201', title: 'Data Structures and Algorithms', creditHours: 3, description: 'Fundamental data structures, algorithm design and complexity analysis.', basedOn: 'CS2005' },
      { code: 'KDU-CS220', title: 'Operating Systems', creditHours: 3, description: 'Processes, memory management, file systems and concurrency.', basedOn: 'CS2006' },
      { code: 'KDU-CS310', title: 'Computer Networks', creditHours: 3, description: 'Network architecture, protocols and network programming.', basedOn: 'CS3001' },
      { code: 'KDU-CS330', title: 'Database Systems', creditHours: 3, description: 'Relational modelling, SQL, transactions and indexing.', basedOn: 'CS3007' },
      { code: 'KDU-AI301', title: 'Introduction to Artificial Intelligence (AI)', creditHours: 3, description: 'Search, reasoning and introductory machine learning.', basedOn: 'CS4001' },
      {
        code: 'KDU-SEC320',
        title: 'Cybersecurity Fundamentals',
        creditHours: 3,
        description: 'Core concepts of information security, cryptography and secure systems.',
        topics: [
          'Security principles: confidentiality, integrity, availability',
          'Threats, vulnerabilities and attack surfaces',
          'Symmetric cryptography and block ciphers',
          'Public-key cryptography and digital signatures',
          'Hash functions, MACs and password storage',
          'Authentication and access control',
          'Network security: firewalls, IDS and VPNs',
          'Web application security: XSS, SQL injection, CSRF',
          'Malware analysis basics',
          'Operating system and software security',
          'Incident response and digital forensics',
          'Risk management and security policy',
          'Privacy, ethics and legal issues',
          'Capstone: security assessment project',
        ],
      },
      {
        code: 'KDU-IOT340',
        title: 'Internet of Things (IoT) Systems',
        creditHours: 3,
        description: 'Design of connected devices, sensors and IoT platforms.',
        topics: [
          'IoT architecture and applications',
          'Sensors, actuators and embedded boards',
          'Microcontroller programming',
          'Wireless protocols: Bluetooth, Zigbee, LoRa, Wi-Fi',
          'IoT messaging protocols: MQTT and CoAP',
          'Edge and fog computing',
          'Cloud platforms and data ingestion',
          'Data storage and stream processing',
          'IoT data analytics',
          'Security and privacy in IoT',
          'Power management and device lifecycle',
          'Smart home and smart city case studies',
          'Industrial IoT',
          'Prototype project',
        ],
      },
    ],
  },
  {
    name: 'Multimedia University (MMU)',
    courses: [
      { code: 'MMU-CS1101', title: 'Introduction to Programming', creditHours: 3, description: 'First course in programming and computational thinking.', basedOn: 'CS1002' },
      { code: 'MMU-CS2201', title: 'Algorithms and Data Structures', creditHours: 3, description: 'Data structures, sorting, searching and graph algorithms.', basedOn: 'CS2005' },
      { code: 'MMU-CS2301', title: 'Operating Systems', creditHours: 3, description: 'Operating system concepts and implementation.', basedOn: 'CS2006' },
      { code: 'MMU-CS3401', title: 'Data Communications & Networking', creditHours: 3, description: 'Data communication principles and network protocols.', basedOn: 'CS3001' },
      { code: 'MMU-CS3501', title: 'Database Management Systems', creditHours: 3, description: 'Database design, SQL and transaction processing.', basedOn: 'CS3007' },
      { code: 'MMU-CS3601', title: 'Software Engineering', creditHours: 3, description: 'Software processes, design, testing and project management.', basedOn: 'CS3009' },
      {
        code: 'MMU-AI4101',
        title: 'Machine Learning & Neural Networks',
        creditHours: 3,
        description: 'Supervised and unsupervised learning with an introduction to deep neural networks.',
        topics: [
          'Machine learning overview and workflow',
          'Linear regression and gradient descent',
          'Logistic regression and classification',
          'Model evaluation, overfitting and regularization',
          'Decision trees and random forests',
          'Support vector machines',
          'Clustering: k-means and hierarchical',
          'Dimensionality reduction and PCA',
          'Perceptrons and multilayer neural networks',
          'Backpropagation and optimization',
          'Convolutional neural networks',
          'Recurrent networks and sequence models',
          'Model deployment and ML ethics',
          'Applied project',
        ],
      },
      {
        code: 'MMU-IT4201',
        title: 'Mobile Application Development',
        creditHours: 3,
        description: 'Building cross-platform and native mobile applications.',
        topics: [
          'Mobile platforms and development environments',
          'User interface design principles for mobile',
          'Layouts, views and navigation',
          'Application lifecycle and state management',
          'Local storage and databases',
          'Networking and REST APIs',
          'Sensors, camera and location services',
          'Push notifications and background tasks',
          'Cross-platform frameworks',
          'Testing and debugging mobile apps',
          'Performance, battery and security considerations',
          'Publishing to app stores',
          'Agile team development',
          'Application project demo',
        ],
      },
    ],
  },
  {
    name: 'Istanbul Aydın University (IAU)',
    courses: [
      { code: 'IAU-CENG101', title: 'Programming Fundamentals', creditHours: 3, description: 'Introduction to programming and algorithmic problem solving.', basedOn: 'CS1002' },
      { code: 'IAU-CENG201', title: 'Algorithms and Data Structures', creditHours: 3, description: 'Design and analysis of algorithms and core data structures.', basedOn: 'CS2005' },
      { code: 'IAU-CENG301', title: 'Operating Systems Design', creditHours: 3, description: 'Design principles of modern operating systems.', basedOn: 'CS2006' },
      { code: 'IAU-CENG320', title: 'Computer Networks', creditHours: 3, description: 'Internet protocols, routing and network applications.', basedOn: 'CS3001' },
      { code: 'IAU-CENG340', title: 'Database Systems', creditHours: 3, description: 'Relational databases, SQL and query optimization.', basedOn: 'CS3007' },
      { code: 'IAU-SENG350', title: 'Software Development Life Cycle (SDLC)', creditHours: 3, description: 'Software development processes from requirements to maintenance.', basedOn: 'CS3009' },
      { code: 'IAU-AI410', title: 'Artificial Intelligence', creditHours: 3, description: 'Intelligent agents, search, knowledge representation and learning.', basedOn: 'CS4001' },
      { code: 'IAU-MATH210', title: 'Linear Algebra', creditHours: 3, description: 'Matrices, vector spaces and eigenvalue problems for engineering.', basedOn: 'MT1004' },
    ],
  },
];

/** Host courses reusing a home course's topics drop its last two weeks, so the outlines are similar but not identical. */
const resolveTopics = (course: HostCourseSeed): string[] => {
  if (course.topics) {
    return course.topics;
  }

  const base = HOME_COURSES.find((home) => home.code === course.basedOn);
  if (!base) {
    throw new Error(`Host course ${course.code} is based on unknown home course ${course.basedOn}.`);
  }

  return base.topics.slice(0, -2);
};

const buildCourse = (course: Omit<CourseSeed, 'topics'>, topics: string[]) => ({
  title: course.title,
  name: course.title,
  code: course.code,
  description: course.description,
  outlineText: toOutline(topics),
  creditHours: course.creditHours,
});

/** Creates the document only when no course with this filter exists, so existing data is never overwritten. */
const createIfMissing = async (filter: Record<string, unknown>, fields: Record<string, unknown>) => {
  const result = await Course.updateOne(filter, { $setOnInsert: fields }, { upsert: true });
  return result.upsertedCount > 0;
};

const seedCourses = async () => {
  try {
    ensureDnsResolvers();
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/xchango');
    console.log('Connected to MongoDB for course seeding...');

    const admin = await User.findOne({ email: 'admin@xchango.com' });
    const createdBy = admin ? admin._id : null;

    let createdHome = 0;
    let filledEmails = 0;
    for (const course of HOME_COURSES) {
      const homeFilter = { code: course.code, universityId: null, $or: [{ type: CourseType.HOME }, { isHomeCourse: true }] };
      const created = await createIfMissing(homeFilter, {
        ...buildCourse(course, course.topics),
        universityId: null,
        type: CourseType.HOME,
        isHomeCourse: true,
        instructorEmail: HOME_INSTRUCTOR_EMAIL,
        createdBy,
      });
      createdHome += created ? 1 : 0;

      // Courses that already existed keep their data, but get the email if they have none.
      const filled = await Course.updateOne({ ...homeFilter, instructorEmail: { $in: ['', null] } }, { $set: { instructorEmail: HOME_INSTRUCTOR_EMAIL } });
      filledEmails += created ? 0 : filled.modifiedCount;
    }

    let createdHost = 0;
    let skippedHost = 0;
    for (const entry of HOST_UNIVERSITIES) {
      const university = await University.findOne({ name: entry.name });
      if (!university) {
        console.warn(`University "${entry.name}" not found in the database, skipping its ${entry.courses.length} courses.`);
        continue;
      }

      for (const course of entry.courses) {
        const created = await createIfMissing(
          { universityId: university._id, code: course.code, type: CourseType.HOST },
          {
            ...buildCourse(course, resolveTopics(course)),
            universityId: university._id,
            type: CourseType.HOST,
            isHomeCourse: false,
            createdBy,
          }
        );
        createdHost += created ? 1 : 0;
        skippedHost += created ? 0 : 1;
      }
    }

    console.log(`Home courses: ${createdHome} created, ${HOME_COURSES.length - createdHome} already existed (${filledEmails} had no instructor email and got one).`);
    console.log(`Host courses: ${createdHost} created, ${skippedHost} already existed.`);
    process.exit(0);
  } catch (error) {
    console.error('Course seeding failed:', error);
    process.exit(1);
  }
};

seedCourses();
