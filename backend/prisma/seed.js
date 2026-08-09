const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@smartfuelstation.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'demo123';

const categories = [
  ['Oil Change', 'Engine oil, filter replacement, and fluid checks.'],
  ['Tire Repair', 'Tire repair, rotation, balancing, and replacement.'],
  ['Battery Check', 'Battery diagnostics, charging, and replacement.'],
  ['Brake Inspection', 'Brake pad, rotor, fluid, and safety inspection.'],
  ['Car Wash', 'Exterior wash, interior cleaning, and detailing.'],
  ['General Inspection', 'Multi-point vehicle inspection and diagnostics.'],
];

const serviceDefinitions = [
  ['Standard Oil Change', 'Oil Change', 25, 30, true],
  ['Synthetic Oil Change', 'Oil Change', 45, 35, true],
  ['Flat Tire Repair', 'Tire Repair', 15, 20, true],
  ['Battery Health Test', 'Battery Check', 10, 15, true],
  ['Brake Safety Inspection', 'Brake Inspection', 20, 25, true],
  ['Full Detail Wash', 'Car Wash', 55, 60, true],
  ['Pre-Purchase Inspection', 'General Inspection', 40, 45, false],
];

function atOffset({ days = 0, hours = 0 }) {
  const date = new Date();
  date.setMilliseconds(0);
  date.setSeconds(0);
  date.setMinutes(0);
  date.setHours(date.getHours() + hours);
  date.setDate(date.getDate() + days);
  return date;
}

async function upsertUser({ name, email, role, phone, passwordHash }) {
  return prisma.user.upsert({
    where: { email },
    update: { name, role, phone },
    create: { name, email, role, phone, password: passwordHash },
  });
}

async function upsertDemoBooking({ tag, customerId, providerServiceId, status, scheduledAt }) {
  const existing = await prisma.booking.findFirst({ where: { notes: tag } });
  const service = await prisma.providerService.findUnique({ where: { id: providerServiceId } });
  const data = {
    customerId,
    providerServiceId,
    status,
    scheduledAt,
    notes: tag,
    priceAtBooking: service.price,
    completedAt: status === 'COMPLETED' ? scheduledAt : null,
    cancelledAt: status === 'CANCELLED' ? scheduledAt : null,
  };

  return existing
    ? prisma.booking.update({ where: { id: existing.id }, data })
    : prisma.booking.create({ data });
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { name: 'Platform Admin', role: 'ADMIN' },
    create: {
      name: 'Platform Admin',
      email: ADMIN_EMAIL,
      password: adminPasswordHash,
      role: 'ADMIN',
    },
  });

  const categoryByName = {};
  for (const [name, description] of categories) {
    categoryByName[name] = await prisma.serviceCategory.upsert({
      where: { name },
      update: { description, isActive: true },
      create: { name, description },
    });
  }

  const providerUser = await upsertUser({
    name: 'Maya Khoury',
    email: 'provider@smartauto.local',
    role: 'PROVIDER',
    phone: '+961 70 555 010',
    passwordHash,
  });

  const provider = await prisma.provider.upsert({
    where: { userId: providerUser.id },
    update: {
      businessName: 'Cedars Auto Care',
      address: 'Hamra Street, Beirut',
      description: 'Full-service automotive care with transparent pricing and live queue updates.',
      isApproved: true,
      isOpen: true,
      latitude: 33.8959,
      longitude: 35.4826,
      estimatedWaitMinutes: 15,
      approvedAt: new Date(),
      approvedById: admin.id,
    },
    create: {
      userId: providerUser.id,
      businessName: 'Cedars Auto Care',
      address: 'Hamra Street, Beirut',
      description: 'Full-service automotive care with transparent pricing and live queue updates.',
      isApproved: true,
      isOpen: true,
      latitude: 33.8959,
      longitude: 35.4826,
      estimatedWaitMinutes: 15,
      approvedAt: new Date(),
      approvedById: admin.id,
    },
  });

  const serviceByName = {};
  for (const [name, categoryName, price, durationMinutes, isAvailable] of serviceDefinitions) {
    serviceByName[name] = await prisma.providerService.upsert({
      where: { providerId_name: { providerId: provider.id, name } },
      update: {
        categoryId: categoryByName[categoryName].id,
        price,
        durationMinutes,
        isAvailable,
      },
      create: {
        providerId: provider.id,
        categoryId: categoryByName[categoryName].id,
        name,
        price,
        durationMinutes,
        isAvailable,
      },
    });
  }

  const customers = await Promise.all([
    upsertUser({
      name: 'Layla Hassan',
      email: 'layla@smartauto.local',
      role: 'CUSTOMER',
      phone: '+961 70 555 101',
      passwordHash,
    }),
    upsertUser({
      name: 'Omar Saeed',
      email: 'omar@smartauto.local',
      role: 'CUSTOMER',
      phone: '+961 70 555 102',
      passwordHash,
    }),
    upsertUser({
      name: 'Nadia Kareem',
      email: 'nadia@smartauto.local',
      role: 'CUSTOMER',
      phone: '+961 70 555 103',
      passwordHash,
    }),
  ]);

  const completedBooking = await upsertDemoBooking({
    tag: '[demo:booking-001]',
    customerId: customers[0].id,
    providerServiceId: serviceByName['Standard Oil Change'].id,
    status: 'COMPLETED',
    scheduledAt: atOffset({ days: -1, hours: -2 }),
  });
  await upsertDemoBooking({
    tag: '[demo:booking-002]',
    customerId: customers[1].id,
    providerServiceId: serviceByName['Flat Tire Repair'].id,
    status: 'CONFIRMED',
    scheduledAt: atOffset({ days: 1, hours: 2 }),
  });
  await upsertDemoBooking({
    tag: '[demo:booking-003]',
    customerId: customers[2].id,
    providerServiceId: serviceByName['Battery Health Test'].id,
    status: 'PENDING',
    scheduledAt: atOffset({ days: 2, hours: 4 }),
  });

  await prisma.review.upsert({
    where: { bookingId: completedBooking.id },
    update: { rating: 5, comment: 'Quick, honest service and clear pricing.' },
    create: {
      bookingId: completedBooking.id,
      customerId: customers[0].id,
      providerId: provider.id,
      rating: 5,
      comment: 'Quick, honest service and clear pricing.',
    },
  });

  const queueSeeds = [
    [1, 'Sami Rasheed', 'Standard Oil Change', 'IN_SERVICE'],
    [2, 'Huda Nasser', 'Flat Tire Repair', 'WAITING'],
    [3, 'Karim Fadel', 'Battery Health Test', 'WAITING'],
  ];
  for (const [position, customerName, serviceName, status] of queueSeeds) {
    await prisma.queueEntry.upsert({
      where: { providerId_position: { providerId: provider.id, position } },
      update: {
        customerName,
        providerServiceId: serviceByName[serviceName].id,
        status,
        startedAt: status === 'IN_SERVICE' ? new Date() : null,
      },
      create: {
        providerId: provider.id,
        providerServiceId: serviceByName[serviceName].id,
        customerName,
        position,
        status,
        startedAt: status === 'IN_SERVICE' ? new Date() : null,
      },
    });
  }

  const complaintSubject = 'Service exceeded the estimated waiting time';
  const existingComplaint = await prisma.complaint.findFirst({
    where: { providerId: provider.id, subject: complaintSubject },
  });
  if (!existingComplaint) {
    await prisma.complaint.create({
      data: {
        submittedById: customers[1].id,
        providerId: provider.id,
        subject: complaintSubject,
        details: 'The appointment began about 30 minutes after the displayed estimate.',
        severity: 'MEDIUM',
      },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    providers: await prisma.provider.count(),
    categories: await prisma.serviceCategory.count(),
    services: await prisma.providerService.count(),
    bookings: await prisma.booking.count(),
    queueEntries: await prisma.queueEntry.count(),
    reviews: await prisma.review.count(),
    complaints: await prisma.complaint.count(),
  };

  console.log('Database seed completed:', counts);
  console.log(`Demo provider: provider@smartauto.local / ${DEMO_PASSWORD}`);
  console.log(`Demo customer: layla@smartauto.local / ${DEMO_PASSWORD}`);
  console.log(`Admin: ${ADMIN_EMAIL} (existing password is preserved if the account already existed)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());