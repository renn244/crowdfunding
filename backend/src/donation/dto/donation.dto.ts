import { IsEmail, IsIn, IsInt, IsNumber, IsString, Min } from 'class-validator';

export class BillingInformation {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  postalCode: string;

  @IsString()
  country: string;
}

export class DonationDto extends BillingInformation {
  // PayMongo's minimum is 20 pesos
  @IsInt()
  @Min(20, { message: 'The minimum donation is ₱20' })
  amount: number;

  @IsIn(['card', 'gcash', 'paymaya', 'grab_pay'])
  paymentMethod: string;

  @IsString()
  campaignId: string;
}

export class SaveDonationDto {
  @IsNumber()
  amount: number;

  @IsString()
  paymentMethod: string;

  @IsString()
  paymentId: string;

  @IsString()
  campaignId: string;
}
