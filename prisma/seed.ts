import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin123!', 12);

  const salon = await prisma.salon.upsert({
    where: { slug: 'demo-salon' },
    update: {},
    create: {
      name: 'Demo Salon',
      slug: 'demo-salon',
      timezone: 'Europe/Berlin',
      currency: 'EUR',
      primaryDomain: 'demo.localhost',
      customDomains: [],
      webhookSecret: 'demo-webhook-secret',
    },
  });

  const admin = await prisma.user.upsert({
    where: { salonId_email: { salonId: salon.id, email: 'admin@demo.com' } },
    update: {},
    create: {
      salonId: salon.id,
      email: 'admin@demo.com',
      passwordHash,
      role: UserRole.SALON_ADMIN,
      name: 'Demo Admin',
    },
  });

  const stylist = await prisma.user.upsert({
    where: { salonId_email: { salonId: salon.id, email: 'stylist@demo.com' } },
    update: {},
    create: {
      salonId: salon.id,
      email: 'stylist@demo.com',
      passwordHash,
      role: UserRole.STAFF,
      name: 'Demo Stylist',
      staffProfile: {
        create: {
          salonId: salon.id,
          skills: ['cut', 'color'],
          colorTag: '#FFAA00',
        },
      },
    },
  });

  // Create multiple services
  const services = await Promise.all([
    prisma.service.upsert({
      where: { id: 'service-1' },
      update: {},
      create: {
        id: 'service-1',
        salonId: salon.id,
        name: 'Haircut',
        priceCents: 4000,
        durationMinutes: 60,
        isActive: true,
      },
    }),
    prisma.service.upsert({
      where: { id: 'service-2' },
      update: {},
      create: {
        id: 'service-2',
        salonId: salon.id,
        name: 'Hair Color',
        priceCents: 8000,
        durationMinutes: 120,
        isActive: true,
      },
    }),
    prisma.service.upsert({
      where: { id: 'service-3' },
      update: {},
      create: {
        id: 'service-3',
        salonId: salon.id,
        name: 'Balayage',
        priceCents: 12000,
        durationMinutes: 180,
        isActive: true,
      },
    }),
    prisma.service.upsert({
      where: { id: 'service-4' },
      update: {},
      create: {
        id: 'service-4',
        salonId: salon.id,
        name: 'Manicure',
        priceCents: 3000,
        durationMinutes: 45,
        isActive: true,
      },
    }),
    prisma.service.upsert({
      where: { id: 'service-5' },
      update: {},
      create: {
        id: 'service-5',
        salonId: salon.id,
        name: 'Pedicure',
        priceCents: 3500,
        durationMinutes: 60,
        isActive: true,
      },
    }),
    prisma.service.upsert({
      where: { id: 'service-6' },
      update: {},
      create: {
        id: 'service-6',
        salonId: salon.id,
        name: 'Facial Treatment',
        priceCents: 6000,
        durationMinutes: 90,
        isActive: true,
      },
    }),
    prisma.service.upsert({
      where: { id: 'service-7' },
      update: {},
      create: {
        id: 'service-7',
        salonId: salon.id,
        name: 'Massage',
        priceCents: 7000,
        durationMinutes: 60,
        isActive: true,
      },
    }),
    prisma.service.upsert({
      where: { id: 'service-8' },
      update: {},
      create: {
        id: 'service-8',
        salonId: salon.id,
        name: 'Eyebrow Shaping',
        priceCents: 2000,
        durationMinutes: 30,
        isActive: true,
      },
    }),
  ]);

  const customer = await prisma.customer.create({
    data: {
      salonId: salon.id,
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+1234567890',
    },
  });

  // Add working hours for the stylist
  const staffProfile = await prisma.staffProfile.findFirst({
    where: { userId: stylist.id },
  });

  if (staffProfile) {
    // Set working hours (Monday to Friday, 9 AM to 6 PM)
    await prisma.workingHours.deleteMany({
      where: { staffId: staffProfile.id },
    });

    await prisma.workingHours.createMany({
      data: [
        { staffId: staffProfile.id, dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isAvailable: true }, // Monday
        { staffId: staffProfile.id, dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isAvailable: true }, // Tuesday
        { staffId: staffProfile.id, dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isAvailable: true }, // Wednesday
        { staffId: staffProfile.id, dayOfWeek: 4, startTime: '09:00', endTime: '18:00', isAvailable: true }, // Thursday
        { staffId: staffProfile.id, dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isAvailable: true }, // Friday
        { staffId: staffProfile.id, dayOfWeek: 6, startTime: '10:00', endTime: '16:00', isAvailable: true }, // Saturday
      ],
    });
  }

  console.log({ 
    salon, 
    admin, 
    stylist, 
    services: services.length, 
    customer,
    workingHours: staffProfile ? 'set' : 'not set'
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


