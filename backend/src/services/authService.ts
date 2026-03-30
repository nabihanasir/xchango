import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User, { IUser, UserRole } from '../models/User';

const generateToken = (id: string, role: string) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

export const registerUser = async (userData: any) => {
  const { email, password, name, role } = userData;

  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new Error('User already exists');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: role || UserRole.STUDENT,
  });

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user._id as string, user.role),
  };
};

export const loginUser = async (credentials: any) => {
  const { email, password } = credentials;

  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id as string, user.role),
    };
  } else {
    throw new Error('Invalid email or password');
  }
};
