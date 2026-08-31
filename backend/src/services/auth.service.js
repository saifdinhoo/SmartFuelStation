const prisma = require('../config/prisma');
const { hashPassword, comparePassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const notificationService = require('./notification.service');

// Roles a person can pick for themselves via public registration.
// ADMIN accounts are never created through this endpoint.
const REGISTERABLE_ROLES = ['CUSTOMER', 'PROVIDER'];

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

// Email is matched case-insensitively everywhere in this file — a real
// account creation problem this phase found and fixed: without this,
// registering "Layla@SmartAuto.Local" while "layla@smartauto.local"
// already existed silently created a second, disconnected account (no
// unique-constraint conflict, since Postgres's default index is
// case-sensitive), and typing an email in a different case than it was
// registered with at login always failed as "Invalid email or password"
// with no indication why. Applied only to the *input* here — no existing
// stored row is ever rewritten, and every account already in this database
// happens to already be lowercase, so this is fully backward-compatible.
function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : email;
}

async function register({ name, email, password, role, phone, businessName, address, description }) {
  if (!name || !email || !password) {
    throw badRequest('name, email and password are required');
  }
  const normalizedEmail = normalizeEmail(email);

  const selectedRole = role || 'CUSTOMER';
  if (!REGISTERABLE_ROLES.includes(selectedRole)) {
    throw badRequest(`role must be one of: ${REGISTERABLE_ROLES.join(', ')}`);
  }

  if (selectedRole === 'PROVIDER' && (!businessName || !address)) {
    throw badRequest('businessName and address are required to register as a provider');
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    const err = new Error('Email already registered');
    err.statusCode = 409;
    throw err;
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: selectedRole,
      phone,
      ...(selectedRole === 'PROVIDER' && {
        provider: {
          create: { businessName, address, description },
        },
      }),
    },
    include: { provider: true },
  });

  if (selectedRole === 'PROVIDER') {
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    await notificationService.createNotifications(
      admins.map((admin) => ({
        userId: admin.id,
        type: 'PROVIDER_REGISTERED',
        title: 'New provider registration',
        message: `${businessName} has registered and is awaiting approval.`,
        relatedProviderId: user.provider.id,
      })),
    );
  }

  return buildAuthResult(user);
}

async function login({ email, password }) {
  if (!email || !password) {
    throw badRequest('email and password are required');
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    include: { provider: true },
  });

  const invalidCredentials = () => {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    return err;
  };

  if (!user) throw invalidCredentials();

  const isValid = await comparePassword(password, user.password);
  if (!isValid) throw invalidCredentials();

  return buildAuthResult(user);
}

async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { provider: true },
  });
  return sanitizeUser(user);
}

function buildAuthResult(user) {
  const token = signToken({ userId: user.id, role: user.role });
  return { token, user: sanitizeUser(user) };
}

// Never send the password hash back to the client.
function sanitizeUser(user) {
  const { password, ...rest } = user;
  return rest;
}

module.exports = { register, login, getCurrentUser };
