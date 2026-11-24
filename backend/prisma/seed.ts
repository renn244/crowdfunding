import { CampaignCategory, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// every person, place name and number below is mock data for the demo
const owners = [
  { email: 'maria.demo@crowdfund.test', username: 'maria_santos', bio: 'Demo account. Volunteer nurse.', location: 'Sta. Maria, Bulacan' },
  { email: 'paolo.demo@crowdfund.test', username: 'paolo_reyes', bio: 'Demo account. Teacher and weekend volunteer.', location: 'Sta. Maria, Bulacan' },
  { email: 'ana.demo@crowdfund.test', username: 'ana_cruz', bio: 'Demo account. Animal rescue volunteer.', location: 'Sta. Maria, Bulacan' },
];

const MOCK_NOTE = 'Mock data: this is a demo campaign for a portfolio project. The organization, organizer, donors and amounts are made up, and no real money is collected.';

const donors = [
  ['Juan', 'Dela Cruz'], ['Liza', 'Navarro'], ['Mark', 'Villanueva'], ['Grace', 'Lim'],
  ['Carlo', 'Mendoza'], ['Bea', 'Garcia'], ['Rico', 'Tan'], ['Joy', 'Ramos'],
];

const campaigns = [
  {
    owner: 0, category: CampaignCategory.MEDICAL, goal: 80000, days: 45, image: 'elderly-home',
    title: 'Medicine and adult diapers for 40 lolas in San Jose Patag',
    body: 'A small home for elderly women in San Jose Patag cares for 40 lolas, most of them without family to visit. Donations run out fast for maintenance medicine, adult diapers and vitamins. Your help covers three months of supplies.',
    gifts: [5000, 1000, 2500, 500, 10000, 1500, 750, 3000],
    updates: [
      { daysAgo: 40, message: 'We met with the caretakers and listed every lola\'s maintenance medicine. The list is longer than we expected, so thank you for sharing this campaign.' },
      { daysAgo: 18, message: 'The first batch of maintenance medicine arrived this week. Salamat po!' },
      { daysAgo: 3, message: 'Adult diapers and vitamins for the next month are delivered. Lola Cora asked us to say thank you to everyone who donated.' },
    ],
  },
  {
    owner: 1, category: CampaignCategory.EDUCATION, goal: 30000, days: 30, image: 'school-supplies',
    title: 'School supplies for 30 kids at a children\'s home in Lalakhan',
    body: 'Thirty kids at a children\'s home in Lalakhan start the school year with hand-me-down notebooks and broken pencils. Each kit has notebooks, pens, crayons, a ruler and a bag.',
    gifts: [2000, 500, 1000, 1000, 300],
    updates: [
      { daysAgo: 25, message: 'We bought the first 12 kits from a school supply store in the Poblacion.' },
      { daysAgo: 6, message: 'The kids picked their own bag colors today. 18 more kits to go before the school year starts.' },
    ],
  },
  {
    owner: 0, category: CampaignCategory.MEDICAL, goal: 60000, days: 60, image: 'wheelchairs',
    title: 'Wheelchairs for seniors and PWDs in Pulong Buhangin',
    body: 'A community care center in Pulong Buhangin shares two old wheelchairs among its seniors and persons with disabilities. Six new wheelchairs would let them join therapy sessions and Sunday mass.',
    gifts: [800, 1200, 500, 2000, 400, 600],
    updates: [
      { daysAgo: 30, message: 'A medical supply store agreed to sell us six wheelchairs at a discount.' },
      { daysAgo: 9, message: 'We reached enough for the first wheelchair. Mang Ben will be the first to use it at therapy next week.' },
    ],
  },
  {
    owner: 0, category: CampaignCategory.DISASTER, goal: 100000, days: 20, image: 'typhoon-relief',
    title: 'Relief packs for typhoon-hit families in Caypombo',
    body: 'Floodwater after the last typhoon reached the roofs of some houses in Caypombo. Each relief pack has rice, canned goods, drinking water and a hygiene kit for a family of five.',
    gifts: [1000, 2000, 500, 5000, 1500, 250, 3500],
    updates: [
      { daysAgo: 14, message: 'First 80 packs handed out at the barangay hall this morning.' },
      { daysAgo: 8, message: 'Second batch is being packed now. Volunteers from the parish youth group joined us.' },
      { daysAgo: 2, message: '160 families have received packs so far. We are now buying water containers for families still waiting for clean water.' },
    ],
  },
  {
    owner: 1, category: CampaignCategory.ENVIRONMENT, goal: 25000, days: 90, image: 'river-cleanup',
    title: 'Clean up the Santa Maria River',
    body: 'Trash and water hyacinth clog the river every rainy season and make the floods worse. We are renting a boat and buying gloves, sacks and safety vests for a monthly volunteer clean-up.',
    gifts: [500, 300, 1000],
    updates: [
      { daysAgo: 20, message: 'We got the barangay\'s go-signal for a clean-up every first Saturday of the month.' },
      { daysAgo: 4, message: 'First clean-up done: 46 sacks of trash and water hyacinth pulled out near the bridge. Next one is next month.' },
    ],
  },
  {
    owner: 2, category: CampaignCategory.ANIMALS, goal: 40000, days: 40, image: 'aspin-shelter',
    title: 'Food and shots for rescued aspins in Poblacion',
    body: 'Volunteers in the Poblacion took in 25 stray aspins from the market area. They need food, deworming and anti-rabies shots before they can be adopted.',
    gifts: [],
    updates: [
      { daysAgo: 12, message: 'A local vet offered free check-ups for all 25 aspins. We still need funds for food and shots.' },
      { daysAgo: 1, message: 'Three of the puppies were adopted this week. Salamat to the families who took them in!' },
    ],
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
        update: owner,
        create: owner,
      }),
    );
  }

  // replace earlier demo data; only campaigns owned by the demo accounts are touched
  const demoPosts = { post: { userId: { in: users.map((user) => user.id) } } };
  await prisma.$transaction([
    prisma.donation.deleteMany({ where: demoPosts }),
    prisma.update.deleteMany({ where: demoPosts }),
    prisma.campaignPost.deleteMany({ where: { userId: { in: users.map((user) => user.id) } } }),
  ]);

  for (const [index, c] of campaigns.entries()) {
    const user = users[c.owner];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + c.days);

    const campaign = await prisma.campaignPost.create({
      data: {
        userId: user.id,
        title: c.title,
        body: `<p>${c.body}</p><p><strong>${MOCK_NOTE}</strong></p>`,
        category: c.category,
        goal: c.goal,
        current: c.gifts.reduce((sum, amount) => sum + amount, 0),
        totalDonors: c.gifts.length,
        // stamped "mock data" photos served from frontend/public/demo
        headerImage: `/demo/${c.image}.jpg`,
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
          city: 'Sta. Maria, Bulacan',
          postalCode: '3022',
          country: 'ph',
          createdAt: monthsAgo(i % 5, 5 + i),
        };
      }),
    });

    await prisma.update.createMany({
      data: c.updates.map(({ daysAgo, message }) => ({ postId: campaign.id, message, createdAt: new Date(Date.now() - daysAgo * 86_400_000) })),
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
