require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Event = require('./models/Event');
const { parseDate } = require('./utils/dateParser');

const seedData = async () => {
  try {
    await connectDB();
    console.log('🌱 Seeding SmartEventa database...\n');

    // Clear existing data
    await User.deleteMany({});
    await Event.deleteMany({});
    console.log('✅ Cleared existing data.');

    // ── Create Users ─────────────────────────────────────────────────────────
    const adminUser = await User.create({
      name: 'Admin SmartEventa',
      email: 'admin@smarteventa.com',
      password: 'Admin@1234',
      role: 'admin',
    });

    const normalUser = await User.create({
      name: 'Demo User',
      email: 'user@smarteventa.com',
      password: 'User@1234',
      role: 'user',
    });

    console.log('✅ Created users:');
    console.log(`   👤 Admin: admin@smarteventa.com / Admin@1234`);
    console.log(`   👤 User:  user@smarteventa.com  / User@1234\n`);

    // ── Create Sample Events ──────────────────────────────────────────────────
    // Dynamic dates relative to today (2026-08-25)
    const sampleEvents = [
      {
        title: 'TechFest 2026 — Annual Technology Summit',
        description:
          'Join industry leaders, innovators, and tech enthusiasts at TechFest 2026. Explore cutting-edge technologies including AI, blockchain, cloud computing, and more. Network with experts and attend hands-on workshops.',
        date: '2026-09-15',
        time: '9:00 AM',
        location: 'Mumbai Convention Centre, Mumbai',
        category: 'Technology',
        image:
          'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop',
        sourceUrl: 'https://example.com/techfest-2026',
        parsedDate: parseDate('2026-09-15'),
        createdBy: adminUser._id,
      },
      {
        title: 'Startup Pitch Night — Season 7',
        description:
          'Watch 12 promising startups pitch their ideas to a panel of investors and industry veterans. The best pitch wins seed funding and mentorship. Open for audience voting and Q&A sessions.',
        date: '2026-08-30',
        time: '6:00 PM',
        location: 'The Garage Hub, Bengaluru',
        category: 'Business',
        image:
          'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&auto=format&fit=crop',
        sourceUrl: 'https://example.com/startup-pitch-night',
        parsedDate: parseDate('2026-08-30'),
        createdBy: adminUser._id,
      },
      {
        title: 'Kids Relay Race & Fun Sports Day',
        description:
          'A fun-filled sports day for kids aged 5–14 featuring relay races, obstacle courses, and team sports. Parents are welcome. Medals and prizes for all participants. Registration required.',
        date: '2026-09-07',
        time: '8:00 AM',
        location: 'Vadodara Sports Complex, Vadodara',
        category: 'Sports',
        image:
          'https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=800&auto=format&fit=crop',
        sourceUrl: 'https://allevents.in/vadodara/kids-relay-race',
        parsedDate: parseDate('2026-09-07'),
        createdBy: adminUser._id,
      },
      {
        title: 'Monsoon Music Festival 2026',
        description:
          'Experience an open-air musical extravaganza featuring classical, folk, and contemporary artists from across India. Food stalls, art installations, and live performances throughout the day.',
        date: '2026-08-25',
        time: '4:00 PM',
        location: 'Shivaji Park, Mumbai',
        category: 'Music',
        image:
          'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop',
        sourceUrl: 'https://example.com/monsoon-music-fest',
        parsedDate: parseDate('2026-08-25'),
        createdBy: adminUser._id,
        participants: [normalUser._id],
      },
      {
        title: 'Food & Culture Expo — Taste of India',
        description:
          'Celebrate the diversity of Indian cuisine at this grand food expo. Sample dishes from 28 states, watch celebrity chef demonstrations, and participate in cooking competitions.',
        date: '2026-08-22', // 3 days ago -> Eligible for Memories!
        time: '11:00 AM',
        location: 'Pragati Maidan, New Delhi',
        category: 'Food',
        image:
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop',
        sourceUrl: 'https://example.com/food-expo',
        parsedDate: parseDate('2026-08-22'),
        createdBy: adminUser._id,
      },
      {
        title: 'Summer Indie Hackers Meetup',
        description:
          'An informal gathering of developers, designers, and solo founders sharing project updates and feedback.',
        date: '2026-08-05', // 20 days ago -> Past event, but > 7 days ago so excluded from Memories!
        time: '5:00 PM',
        location: 'Koramangala, Bengaluru',
        category: 'Business',
        image:
          'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&auto=format&fit=crop',
        sourceUrl: 'https://example.com/summer-meetup',
        parsedDate: parseDate('2026-08-05'),
        createdBy: adminUser._id,
      },
    ];

    const events = await Event.insertMany(sampleEvents);
    console.log(`✅ Created ${events.length} sample events:\n`);
    events.forEach((e) => console.log(`   📅 ${e.title}`));

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('━'.repeat(50));
    console.log('Admin Login: admin@smarteventa.com / Admin@1234');
    console.log('User Login:  user@smarteventa.com  / User@1234');
    console.log('━'.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
