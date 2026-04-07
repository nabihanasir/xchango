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
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importStar(require("./models/User"));
dotenv_1.default.config();
const ADMIN_EMAIL = 'admin@xchango.com';
const ADMIN_PASSWORD = 'Admin@123';
const ADMIN_NAME = 'System Admin';
const ADMIN_PHONE = '+92-300-0000001';
const ADMIN_SAP_ID = 'ADM0001';
const ensureAdmin = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/xchango');
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(ADMIN_PASSWORD, salt);
        const admin = await User_1.default.findOneAndUpdate({ email: ADMIN_EMAIL }, {
            $set: {
                name: ADMIN_NAME,
                email: ADMIN_EMAIL,
                password: hashedPassword,
                role: User_1.UserRole.ADMIN,
                phone: ADMIN_PHONE,
                sapId: ADMIN_SAP_ID,
                isActive: true,
            },
        }, {
            upsert: true,
            returnDocument: 'after',
        });
        console.log('Admin user is ready.');
        console.log(`Email: ${ADMIN_EMAIL}`);
        console.log(`Password: ${ADMIN_PASSWORD}`);
        console.log(`User ID: ${admin._id.toString()}`);
        await mongoose_1.default.disconnect();
        process.exit(0);
    }
    catch (error) {
        console.error('Failed to ensure admin user:', error);
        await mongoose_1.default.disconnect().catch(() => undefined);
        process.exit(1);
    }
};
void ensureAdmin();
