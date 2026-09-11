import { registerUser } from './authService';
import User from '../models/User';
import { UserRole } from '../models/User';

jest.mock('../models/User');
jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    genSalt: jest.fn().mockResolvedValue('salt'),
    hash: jest.fn().mockResolvedValue('hashed-password'),
  },
}));
jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const MockedUser = User as jest.Mocked<typeof User>;

const validPayload = {
  name: 'Ada Lovelace',
  email: 'Ada@Example.com',
  password: 'supersecret',
  role: UserRole.STUDENT,
  phone: '+92-300-1234567',
  sapId: '70000009',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('registerUser', () => {
  it('rejects a SAP ID that already belongs to another account', async () => {
    MockedUser.findOne.mockResolvedValue({
      email: 'someone.else@example.com',
      sapId: '70000009',
    } as never);

    await expect(registerUser(validPayload)).rejects.toMatchObject({
      code: 'SAP_ID_ALREADY_EXISTS',
      status: 400,
    });

    expect(MockedUser.create).not.toHaveBeenCalled();
  });

  it('still reports a duplicate email distinctly', async () => {
    MockedUser.findOne.mockResolvedValue({
      email: 'ada@example.com',
      sapId: '70000009',
    } as never);

    await expect(registerUser(validPayload)).rejects.toMatchObject({
      code: 'USER_ALREADY_EXISTS',
      status: 400,
    });
  });

  it('propagates the underlying driver error instead of masking it as a generic 500', async () => {
    MockedUser.findOne.mockResolvedValue(null as never);

    const duplicateKeyError = Object.assign(new Error('E11000 duplicate key error'), {
      code: 11000,
      keyPattern: { sapId: 1 },
    });
    MockedUser.create.mockRejectedValue(duplicateKeyError as never);

    // The raw error must reach errorMiddleware, which turns E11000 into a 400.
    await expect(registerUser(validPayload)).rejects.toMatchObject({ code: 11000 });
  });

  it('normalizes email and SAP ID before persisting', async () => {
    MockedUser.findOne.mockResolvedValue(null as never);
    MockedUser.create.mockResolvedValue({
      _id: { toString: () => 'user-id' },
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      role: UserRole.STUDENT,
    } as never);

    await registerUser({ ...validPayload, sapId: '  70000009  ' });

    expect(MockedUser.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ada@example.com', sapId: '70000009' }),
    );
  });
});
