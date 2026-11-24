import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { enUS } from 'date-fns/locale';
import { CampaignService } from 'src/campaign/campaign.service';
import { EmailSenderService } from 'src/email-sender/email-sender.service';
import { RequestUser } from 'src/guards/user.decorator';
import { InboxService } from 'src/inbox/inbox.service';
import { PaymentService } from 'src/payment/payment.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { DonationDto } from './dto/donation.dto';
import { StripeService } from 'src/stripe/stripe.service';
import { Month } from 'date-fns/types';

@Injectable()
export class DonationService {
  private readonly logger = new Logger(DonationService.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly campaignService: CampaignService,
    private readonly prisma: PrismaService,
    private readonly emailSender: EmailSenderService,
    private readonly inboxService: InboxService,
    private readonly stripeService: StripeService,
  ) {}

  // try to make 2 different for stripe and paymongo
  async createDonationGateway(
    userId: string,
    { amount, paymentMethod, campaignId, ...BillingInformation }: DonationDto,
  ) {
    const campaign = await this.campaignService.getCampaign(campaignId);

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    
    // if card go to stripe
    if(paymentMethod === 'card') {
      try {
        const stripeSession = await this.stripeService.createPaymentSession(amount, 'PHP', campaignId, BillingInformation);

        return {
          success: true,
          type: 'stripe',
          stripeSession: stripeSession
        }
      } catch (error) {
        throw new InternalServerErrorException('Failed to create stripe session');
      }
    }

    const newPaymentIntent = await this.paymentService.createPaymentIntent(
      amount,
      userId,
      campaign,
      {...BillingInformation},
    );
    const newPaymentMethod = await this.paymentService.createPaymentMethod(paymentMethod);
    const attachPayment = await this.paymentService.attachPaymentIntent(
      newPaymentIntent.id,
      newPaymentMethod.id,
      newPaymentIntent.attributes?.client_key,
    );

    return {
      success: true,
      type: 'paymongo',
      redirectUrl: attachPayment.attributes.next_action.redirect.url,
    };
  }

  // saves a paid donation once; the donation and the campaign total change together,
  // and the email and notification can fail without losing the donation
  async recordDonation(billing: any, campaignId: string, amount: number, userId: string | undefined, paymentId: string) {
    const existing = await this.prisma.donation.findFirst({ where: { paymentId } });
    if (existing) {
      return { success: true, message: 'Donation already exist', donation: existing };
    }

    const [donation] = await this.prisma.$transaction([
      this.prisma.donation.create({
        data: {
          amount,
          paymentId,
          message: '',
          postId: campaignId,
          userId: userId || null,
          firstName: billing.firstName,
          lastName: billing.lastName,
          email: billing.email,
          address: billing.address,
          city: billing.city,
          postalCode: billing.postalCode,
          country: billing.country,
        },
        include: { post: { select: { id: true, headerImage: true, userId: true } } },
      }),
      this.prisma.campaignPost.update({
        where: { id: campaignId },
        data: { current: { increment: amount }, totalDonors: { increment: 1 } },
      }),
    ]);

    await this.emailSender.sendDonationEmail(billing.email, billing.firstName, amount * 100, donation.post.headerImage)
      .catch(() => this.logger.warn(`Donation email failed for ${donation.id}`));
    await this.inboxService.createNotification({
      userId: donation.post.userId,
      title: 'New Donation',
      message: `You have received a new donation of ₱${amount} from ${billing.firstName} ${billing.lastName}`,
      type: 'PUSH',
    }).catch(() => this.logger.warn(`Donation notification failed for ${donation.id}`));

    return { success: true, donation };
  }

  async handleCheckPaymongoDonations(userId: string | undefined, paymentId: string) {
    const payment = await this.paymentService.retrievePaymentIntent(paymentId);
    if (payment.attributes.status !== 'succeeded') {
      return { success: false, message: 'Payment intent not yet succeeded' };
    }

    const billing = payment.attributes.metadata;
    return this.recordDonation(billing, billing.campaignId, payment.attributes.amount / 100, userId, paymentId);
  }

  async handleCheckStripeDonations(userId: string | undefined, sessionId: string) {
    const session = await this.stripeService.retrievePaymentSession(sessionId);
    if (session.payment_status !== 'paid') {
      return { success: false, message: 'Payment intent not yet succeeded' };
    }

    return this.recordDonation(session.metadata, session.metadata.campaignId, session.amount_total / 100, userId, sessionId);
  }

  async checkDonations(userId: string | undefined, { paymentId, type }) {
    if (type !== 'paymongo' && type !== 'stripe') {
      throw new BadRequestException('Invalid payment type');
    }

    const result = type === 'paymongo'
      ? await this.handleCheckPaymongoDonations(userId, paymentId)
      : await this.handleCheckStripeDonations(userId, paymentId);

    if (!('donation' in result)) {
      return { success: false, message: result.message };
    }

    return {
      success: true,
      donation: result.donation,
      redirectUrl: `${process.env.CLIENT_BASE_URL}/campaigns/${result.donation.postId}`,
    };
  }

  async checkMyDonations(user: RequestUser, search: string, page: number) {
    try {
      const take = 10;
      const skip = (page - 1) * take;
      const donations = await this.prisma.donation.findMany({
        where: {
          AND: [
            {
              post: {
                userId: user.id, // Ensures the post belongs to the user
              },
            },
            {
              OR: [
                {
                  post: {
                    title: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
                {
                  user: {
                    username: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
              ],
            },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              profile: true,
            },
          },
          post: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });

      const hasNext = (await this.prisma.donation.count({ where: { post: { userId: user.id } } })) > page * take;

      return {
        donations: donations,
        hasNext: hasNext,
      };
    } catch (error) {
      throw new InternalServerErrorException('Internal server error');
    }
  }

  // stats for donations made to the user's campaigns
  async getDonationStatistics(userId: string) {
    const stats = await this.prisma.donation.aggregate({
      where: {
        post: { userId: userId },
      },
      _sum: { amount: true },
      _avg: { amount: true },
      _count: true,
    });

    return {
      totalDonations: stats._sum.amount ?? 0,
      totalDonors: stats._count,
      averageDonation: stats._avg.amount ?? 0,
    };
  }

  async getRecentDonations(user: RequestUser) {
    const donations = await this.prisma.donation.findMany({
      where: {
        post: {
          userId: user.id,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: true,
            email: true,
          },
        },
      },
      take: 10,
    });

    return donations;
  }

  async getMonthlyDonations(user: RequestUser) {
    const donations = await this.prisma.donation.findMany({
      where: {
        post: { userId: user.id },
      },
    });

    const monthlyDonations = donations.reduce((acc, donation) => {
      const month = donation.createdAt.getMonth();
      acc[month] = (acc[month] || 0) + donation.amount;
      return acc;
    }, {});

    let monthlyDonationsArray = [];
    for (let key in monthlyDonations) {
      monthlyDonationsArray.push({
        month: enUS.localize.month(parseInt(key, 10) as Month, { width: 'abbreviated' }),
        amount: monthlyDonations[key] || 0,
      });
    }

    return monthlyDonationsArray;
  }

  async getOverview(user: RequestUser) {
    const userId = user.id;
    const { totalDonations, averageDonation, totalDonors } =
      await this.getDonationStatistics(user.id);
    const recentDonations = await this.getRecentDonations(user);
    const monthlyDonationsStats = await this.getMonthlyDonations(user);

    const activeCampaignscount = await this.prisma.campaignPost.count({
      where: {
        userId: userId,
        status: 'ACTIVE',
      },
    });

    return {
      activeCampaignscount,
      totalDonations,
      averageDonation,
      totalDonors,
      recentDonations,
      monthlyDonationsStats,
    };
  }

  async getDonation(donationId: string) {
    const donation = await this.prisma.donation.findUnique({
      where: {
        id: donationId,
      },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            headerImage: true,
          },
        },
      },
    });

    if(!donation) {
      throw new NotFoundException('Donation not found');
    }

    return donation;
  }

  async editUpdateMessage(message: string, donationId: string) {
    const updateMessage = await this.prisma.donation.update({
      where: {
        id: donationId,
      },
      data: {
        message: message,
      },
    });

    return updateMessage;
  }
}
