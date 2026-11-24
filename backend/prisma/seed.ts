import { CampaignCategory, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const owners = [
  { email: 'maria.demo@crowdfund.test', username: 'maria_santos', bio: 'Nurse from Cebu.', location: 'Cebu City' },
  { email: 'paolo.demo@crowdfund.test', username: 'paolo_reyes', bio: 'Teacher and weekend volunteer.', location: 'Quezon City' },
  { email: 'ana.demo@crowdfund.test', username: 'ana_cruz', bio: 'Runs a small animal rescue.', location: 'Davao City' },
];

const donors = [
  ['Juan', 'Dela Cruz'], ['Liza', 'Navarro'], ['Mark', 'Villanueva'], ['Grace', 'Lim'],
  ['Carlo', 'Mendoza'], ['Bea', 'Garcia'], ['Rico', 'Tan'], ['Joy', 'Ramos'],
];

const campaigns = [
  {
    owner: 0, category: CampaignCategory.MEDICAL, goal: 150000, days: 45, image: 'medical',
    title: 'Help Lola Ising get her heart surgery',
    body: 'Lola Ising has been our neighborhood sari-sari store owner for 30 years. She now needs a heart valve replacement that her family cannot cover. Every peso goes straight to the hospital bill.',
    gifts: [5000, 1000, 2500, 500, 10000, 1500, 750, 3000],
    updates: ['Lola Ising had her pre-op checkup today and the doctors say she is ready. Thank you all!'],
  },
  {
    owner: 1, category: CampaignCategory.EDUCATION, goal: 60000, days: 30, image: 'school',
    title: 'Laptops for Grade 6 students in Antipolo',
    body: 'Our public school shares one computer for 40 students. We want to buy 3 refurbished laptops so the kids can practice typing and research for their projects.',
    gifts: [2000, 500, 1000, 1000, 300],
    updates: ['We found a refurbisher who can give us 4 laptops for the same price!'],
  },
  {
    owner: 2, category: CampaignCategory.ANIMALS, goal: 40000, days: 60, image: 'dogs',
    title: 'Food and shots for 25 rescued aspins',
    body: 'We took in 25 stray aspins after the last typhoon. They need food, deworming and anti-rabies shots before they can be adopted.',
    gifts: [800, 1200, 500, 2000, 400, 600],
    updates: [],
  },
  {
    owner: 0, category: CampaignCategory.DISASTER, goal: 100000, days: 20, image: 'flood',
    title: 'Relief packs for flood victims in Marikina',
    body: 'Families along the river lost most of their things in the flood. Each relief pack has rice, canned goods, water and hygiene kits for a family of five.',
    gifts: [1000, 2000, 500, 5000, 1500, 250, 3500],
    updates: ['First 80 packs delivered this morning.', 'Second batch is being packed now.'],
  },
  {
    owner: 1, category: CampaignCategory.ENVIRONMENT, goal: 25000, days: 90, image: 'mangrove',
    title: 'Plant 2,000 mangroves in Bataan',
    body: 'Mangroves protect our coast from storm surges and give fish a place to breed. We are organizing a weekend planting with local fisherfolk.',
    gifts: [500, 300, 1000],
    updates: [],
  },
  {
    owner: 2, category: CampaignCategory.BUSINESS, goal: 35000, days: 40, image: 'bakery',
    title: 'Restart Aling Nena\'s bakery after the fire',
    body: 'A fire took Aling Nena\'s oven and mixer. Help her buy new equipment so she can bake pandesal for the barangay again.',
    gifts: [],
    updates: [],
  },
];

const monthsAgo = (months: number, day: number) => {
  const date = new Date();
  date.setMonth(date.getMonth() - months, day);
  return date;
};

async function main() {
  const users = [];
  for (const owner of owners) {
    users.push(
      await prisma.user.upsert({
        where: { email: owner.email },
        update: {},
        create: owner,
      }),
    );
  }

  for (const [index, c] of campaigns.entries()) {
    const user = users[c.owner];
    const exists = await prisma.campaignPost.findUnique({ where: { userId_title: { userId: user.id, title: c.title } } });
    if (exists) continue;

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + c.days);

    const campaign = await prisma.campaignPost.create({
      data: {
        userId: user.id,
        title: c.title,
        body: c.body,
        category: c.category,
        goal: c.goal,
        current: c.gifts.reduce((sum, amount) => sum + amount, 0),
        totalDonors: c.gifts.length,
        headerImage: `https://picsum.photos/seed/${c.image}/800/450`,
        endDate,
        createdAt: monthsAgo(5, 1 + index),
      },
    });

    await prisma.donation.createMany({
      data: c.gifts.map((amount, i) => {
        const [firstName, lastName] = donors[i % donors.length];
        return {
          postId: campaign.id,
          amount,
          message: i % 3 === 0 ? 'Laban lang! Praying for you.' : '',
          paymentId: `seed_${campaign.id}_${i}`,
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s/g, '')}@crowdfund.test`,
          address: '123 Rizal St.',
          city: 'Manila',
          postalCode: '1000',
          country: 'ph',
          createdAt: monthsAgo(i % 5, 5 + i),
        };
      }),
    });

    await prisma.update.createMany({
      data: c.updates.map((message) => ({ postId: campaign.id, message })),
    });
  }

  console.log(`Seeded ${owners.length} users and ${campaigns.length} campaigns`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
