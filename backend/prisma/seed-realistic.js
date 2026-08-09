const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { createHash } = require('crypto');

const prisma = new PrismaClient();
const PASSWORD = process.env.DEMO_PASSWORD || 'demo123';

const categories = {
  'Oil Change': [
    ['Standard Oil Change', 25, 30],
    ['Synthetic Oil Change', 45, 35],
    ['Oil and Filter Premium', 55, 40],
  ],
  'Tire Repair': [
    ['Flat Tire Repair', 15, 20],
    ['Tire Rotation', 20, 25],
    ['Wheel Balancing', 30, 35],
  ],
  'Battery Check': [
    ['Battery Health Test', 10, 15],
    ['Battery Replacement', 90, 40],
    ['Charging System Diagnostic', 25, 25],
  ],
  'Brake Inspection': [
    ['Brake Safety Inspection', 20, 25],
    ['Front Brake Pad Replacement', 75, 60],
    ['Brake Fluid Change', 35, 30],
  ],
  'Car Wash': [
    ['Exterior Hand Wash', 12, 20],
    ['Interior and Exterior Wash', 25, 40],
    ['Full Detail Wash', 55, 75],
  ],
  'General Inspection': [
    ['Multi-Point Inspection', 30, 40],
    ['Pre-Purchase Inspection', 50, 60],
    ['Computer Diagnostic Scan', 35, 30],
  ],
};

const providerSeeds = [
  ['provider@smartauto.local', 'Maya Khoury', 'Cedars Auto Care', 'Hamra Street, Beirut', 33.8959, 35.4826, ['Oil Change', 'General Inspection']],
  ['beirut.tires@smartauto.local', 'Fadi Nassar', 'Beirut Tire Depot', 'Sin El Fil, Beirut', 33.8797, 35.5423, ['Tire Repair', 'General Inspection']],
  ['volt.battery@smartauto.local', 'Rami Haddad', 'Volt Battery Care', 'Achrafieh, Beirut', 33.8886, 35.5165, ['Battery Check', 'General Inspection']],
  ['safestop@smartauto.local', 'Nour Mansour', 'SafeStop Brake Center', 'Furn El Chebbak, Beirut', 33.8657, 35.5215, ['Brake Inspection', 'General Inspection']],
  ['sparkle@smartauto.local', 'Lina Aoun', 'Sparkle Car Spa', 'Verdun, Beirut', 33.8869, 35.4788, ['Car Wash']],
  ['horizon@smartauto.local', 'Tarek Kassem', 'Horizon Vehicle Inspection', 'Dora, Beirut', 33.9106, 35.5514, ['General Inspection', 'Battery Check']],
  ['metro.lube@smartauto.local', 'Sami Boulos', 'Metro Express Lube', 'Jal El Dib, Metn', 33.9271, 35.5865, ['Oil Change', 'Battery Check']],
  ['falcon.tires@smartauto.local', 'Yara Fadel', 'Falcon Tire Works', 'Baabda Main Road', 33.8342, 35.5434, ['Tire Repair', 'Brake Inspection']],
  ['powercell@smartauto.local', 'Karim Zein', 'PowerCell Batteries', 'Antelias Highway', 33.9214, 35.6156, ['Battery Check']],
  ['precision@smartauto.local', 'Dina Sarkis', 'Precision Brake & Suspension', 'Jounieh Highway', 33.9808, 35.6178, ['Brake Inspection', 'Tire Repair']],
];

const customerNames = [
  'Layla Hassan', 'Omar Saeed', 'Nadia Kareem', 'Yousef Ali', 'Huda Nasser',
  'Karim Fadel', 'Rana Aziz', 'Sami Rasheed', 'Maya Rahal', 'Hassan Zeidan',
  'Rami Sarkis', 'Dina Aoun', 'Tarek Haddad', 'Lina Kassem', 'Yara Mansour',
  'Deema Khalil', 'Jad Saliba', 'Mariam Harb', 'Walid Daher', 'Sarah Khoury',
  'Ali Hamdan', 'Rita Ghosn', 'Georges Nader', 'Reem Farhat',
];

const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');

function relativeDate(days, hour) {
  const date = new Date();
  date.setMilliseconds(0);
  date.setSeconds(0);
  date.setMinutes(0);
  date.setHours(hour);
  date.setDate(date.getDate() + days);
  return date;
}

async function upsertUser(data, password) {
  return prisma.user.upsert({
    where: { email: data.email },
    update: { name: data.name, role: data.role, phone: data.phone },
    create: { ...data, password },
  });
}

async function upsertBooking(tag, data) {
  const existing = await prisma.booking.findFirst({ where: { notes: tag } });
  return existing
    ? prisma.booking.update({ where: { id: existing.id }, data: { ...data, notes: tag } })
    : prisma.booking.create({ data: { ...data, notes: tag } });
}

async function main() {
  const password = await bcrypt.hash(PASSWORD, 10);
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) throw new Error('Run npm run seed first to create the admin.');

  const categoryRows = {};
  for (const name of Object.keys(categories)) {
    categoryRows[name] = await prisma.serviceCategory.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, description: `${name} services managed by platform administrators.` },
    });
  }

  const providers = [];
  const services = [];
  for (let index = 0; index < providerSeeds.length; index += 1) {
    const [email, owner, businessName, address, latitude, longitude, offered] = providerSeeds[index];
    const user = await upsertUser({
      name: owner, email, role: 'PROVIDER',
      phone: `+961 70 ${String(555000 + index)}`,
    }, password);
    const approved = index < 9;
    const provider = await prisma.provider.upsert({
      where: { userId: user.id },
      update: {
        businessName, address, latitude, longitude, isApproved: approved,
        description: `${businessName} provides professional automotive care with transparent pricing.`,
        isOpen: approved && index % 4 !== 3,
        estimatedWaitMinutes: approved ? 8 + (index * 5) % 38 : 0,
        approvedAt: approved ? relativeDate(-30 - index, 10) : null,
        approvedById: approved ? admin.id : null,
      },
      create: {
        userId: user.id, businessName, address, latitude, longitude, isApproved: approved,
        description: `${businessName} provides professional automotive care with transparent pricing.`,
        isOpen: approved && index % 4 !== 3,
        estimatedWaitMinutes: approved ? 8 + (index * 5) % 38 : 0,
        approvedAt: approved ? relativeDate(-30 - index, 10) : null,
        approvedById: approved ? admin.id : null,
      },
    });

    const providerServices = [];
    for (const categoryName of offered) {
      for (const [name, basePrice, durationMinutes] of categories[categoryName]) {
        const price = basePrice + (index % 3) * 2;
        const service = await prisma.providerService.upsert({
          where: { providerId_name: { providerId: provider.id, name } },
          update: { categoryId: categoryRows[categoryName].id, price, durationMinutes, isAvailable: true },
          create: { providerId: provider.id, categoryId: categoryRows[categoryName].id, name, price, durationMinutes },
        });
        providerServices.push(service);
        services.push({ ...service, provider });
      }
    }
    providers.push({ ...provider, services: providerServices });
  }

  const customers = [];
  for (let index = 0; index < customerNames.length; index += 1) {
    const name = customerNames[index];
    customers.push(await upsertUser({
      name,
      email: `${slug(name)}@customer.smartauto.local`,
      role: 'CUSTOMER',
      phone: `+961 71 ${String(100000 + index).slice(-6)}`,
    }, password));
  }

  const statusCycle = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'CONFIRMED', 'PENDING'];
  const bookings = [];
  for (let index = 0; index < 120; index += 1) {
    const service = services[index % services.length];
    if (!service.provider.isApproved) continue;
    const customer = customers[(index * 7) % customers.length];
    const status = statusCycle[index % statusCycle.length];
    const isPast = ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(status);
    const scheduledAt = relativeDate(isPast ? -1 - (index % 75) : 1 + (index % 14), 8 + (index % 10));
    const tag = `[seed:realistic:booking-${String(index + 1).padStart(3, '0')}]`;
    bookings.push(await upsertBooking(tag, {
      customerId: customer.id,
      providerServiceId: service.id,
      status,
      scheduledAt,
      priceAtBooking: service.price,
      completedAt: status === 'COMPLETED' ? scheduledAt : null,
      cancelledAt: status === 'CANCELLED' ? scheduledAt : null,
    }));
  }

  const comments = [
    'Fast service and the final price matched the quote.',
    'Friendly staff and a clear explanation of the work.',
    'The booking started on time and the result was excellent.',
    'Good value and professional service.',
    'Clean workshop and helpful updates while I waited.',
    'Good work, although the wait was longer than expected.',
  ];
  let reviewIndex = 0;
  for (const booking of bookings.filter((row) => row.status === 'COMPLETED')) {
    const service = services.find((row) => row.id === booking.providerServiceId);
    const rating = [5, 5, 4, 5, 4, 3][reviewIndex % 6];
    await prisma.review.upsert({
      where: { bookingId: booking.id },
      update: { rating, comment: comments[reviewIndex % comments.length] },
      create: {
        bookingId: booking.id, customerId: booking.customerId,
        providerId: service.providerId, rating,
        comment: comments[reviewIndex % comments.length],
      },
    });
    reviewIndex += 1;
  }

  const walkIns = ['Sami Rasheed', 'Huda Nasser', 'Karim Fadel'];
  for (const provider of providers.filter((row) => row.isApproved)) {
    for (let position = 1; position <= 3; position += 1) {
      const status = position === 1 ? 'IN_SERVICE' : 'WAITING';
      await prisma.queueEntry.upsert({
        where: { providerId_position: { providerId: provider.id, position } },
        update: {
          providerServiceId: provider.services[(position - 1) % provider.services.length].id,
          customerName: walkIns[(provider.id + position) % walkIns.length],
          status, startedAt: status === 'IN_SERVICE' ? new Date() : null,
        },
        create: {
          providerId: provider.id,
          providerServiceId: provider.services[(position - 1) % provider.services.length].id,
          customerName: walkIns[(provider.id + position) % walkIns.length],
          position, status, startedAt: status === 'IN_SERVICE' ? new Date() : null,
        },
      });
    }
  }

  const complaintSubjects = [
    'Service exceeded the estimated waiting time',
    'Final price was higher than the displayed quote',
    'Appointment was marked complete too early',
    'Receipt was not provided after service',
    'Provider communication needs improvement',
    'Service result requires a follow-up inspection',
  ];
  for (let index = 0; index < complaintSubjects.length; index += 1) {
    const provider = providers[index % 8];
    const subject = complaintSubjects[index];
    const existing = await prisma.complaint.findFirst({ where: { providerId: provider.id, subject } });
    if (!existing) {
      await prisma.complaint.create({
        data: {
          submittedById: customers[(index * 3) % customers.length].id,
          providerId: provider.id,
          subject,
          details: 'Realistic synthetic record for testing the admin complaint workflow.',
          severity: ['LOW', 'MEDIUM', 'HIGH'][index % 3],
          status: index < 4 ? 'OPEN' : 'IN_REVIEW',
        },
      });
    }
  }

  // Password-reset records store hashes only; these exercise active, used, and expired states.
  for (let index = 0; index < 6; index += 1) {
    const customer = customers[index];
    const tokenHash = createHash('sha256')
      .update('realistic-reset-' + customer.id)
      .digest('hex');
    const createdAt = relativeDate(-index, 9);
    const expiresAt = new Date(createdAt.getTime() + 60 * 60 * 1000);
    await prisma.passwordResetToken.upsert({
      where: { tokenHash },
      update: {
        userId: customer.id,
        createdAt,
        expiresAt,
        usedAt: index < 2 ? new Date(createdAt.getTime() + 15 * 60 * 1000) : null,
      },
      create: {
        userId: customer.id,
        tokenHash,
        createdAt,
        expiresAt,
        usedAt: index < 2 ? new Date(createdAt.getTime() + 15 * 60 * 1000) : null,
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
    passwordResetTokens: await prisma.passwordResetToken.count(),
  };
  console.log('Realistic development data loaded:', counts);
  console.log(`Generated accounts use password: ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
