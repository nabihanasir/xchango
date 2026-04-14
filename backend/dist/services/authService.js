"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = exports.registerUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importStar(require("../models/User"));
const AppError_1 = require("../errors/AppError");
const generateToken = (id, role) => {
    return jsonwebtoken_1.default.sign({ id, role }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};
const registerUser = async (userData) => {
    const { email, password, name, role, phone, sapId } = userData;
    const normalizedRole = role || User_1.UserRole.STUDENT;
    if (normalizedRole !== User_1.UserRole.STUDENT) {
        throw new AppError_1.ValidationError('Invalid role selection', 'Self registration is only available for student accounts.', 'Please select the student role to create your account.', 'INVALID_ROLE_SELECTION');
    }
    if (!phone?.trim() || !sapId?.trim()) {
        throw new AppError_1.ValidationError('Missing registration details', 'Phone number and SAP ID are required for student registration.', 'Please provide both phone number and SAP ID, then submit the form again.', 'MISSING_STUDENT_REGISTRATION_FIELDS');
    }
    if (!name?.trim()) {
        throw new AppError_1.ValidationError('Name is required', 'The registration request did not include a full name.', 'Please enter your full name and try again.', 'NAME_REQUIRED');
    }
    if (!email?.trim()) {
        throw new AppError_1.ValidationError('Email is required', 'The registration request did not include an email address.', 'Please enter a valid university or personal email address.', 'EMAIL_REQUIRED');
    }
    if (!password || password.length < 8) {
        throw new AppError_1.ValidationError('Password is too short', 'The password must be at least 8 characters long.', 'Please choose a stronger password with at least 8 characters.', 'PASSWORD_TOO_SHORT');
    }
    const normalizedEmail = email.trim().toLowerCase();
    let userExists;
    try {
        userExists = await User_1.default.findOne({ email: normalizedEmail });
    }
    catch {
        throw new AppError_1.DatabaseError('Unable to check existing account', 'The system could not verify whether the email is already registered.', 'Please try again in a moment.', 'USER_LOOKUP_FAILED');
    }
    if (userExists) {
        throw new AppError_1.ValidationError('Account already exists', 'A user is already registered with the provided email address.', 'Please log in with that account or use a different email address.', 'USER_ALREADY_EXISTS');
    }
    const salt = await bcryptjs_1.default.genSalt(10);
    const hashedPassword = await bcryptjs_1.default.hash(password, salt);
    let user;
    try {
        user = await User_1.default.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: normalizedRole,
            phone: phone.trim(),
            sapId: sapId.trim(),
        });
    }
    catch {
        throw new AppError_1.DatabaseError('Unable to create account', 'The database could not save the new user record.', 'Please try again shortly. If the issue persists, contact support.', 'USER_CREATION_FAILED');
    }
    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id.toString(), user.role),
    };
};
exports.registerUser = registerUser;
const loginUser = async (credentials) => {
    const { email, password } = credentials;
    if (!email?.trim()) {
        throw new AppError_1.ValidationError('Email is required', 'The login request did not include an email address.', 'Please enter your email address and try again.', 'EMAIL_REQUIRED');
    }
    if (!password) {
        throw new AppError_1.ValidationError('Password is required', 'The login request did not include a password.', 'Please enter your password and try again.', 'PASSWORD_REQUIRED');
    }
    let user;
    try {
        user = await User_1.default.findOne({ email: email.trim().toLowerCase() });
    }
    catch {
        throw new AppError_1.DatabaseError('Unable to complete login', 'The system could not retrieve the user account from the database.', 'Please try again in a moment.', 'LOGIN_USER_LOOKUP_FAILED');
    }
    if (user && (await bcryptjs_1.default.compare(password, user.password))) {
        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id.toString(), user.role),
        };
    }
    throw new AppError_1.AuthenticationError('Login failed', 'The email address or password is incorrect.', 'Please re-enter your credentials or reset your password if needed.', 'INVALID_CREDENTIALS');
};
exports.loginUser = loginUser;
