import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum CardType {
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  AMEX = 'amex',
  DISCOVER = 'discover',
}

export enum CardStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
}

@Entity('payment_cards')
@Index(['userId'])
export class PaymentCard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  cardHolderName: string;

  @Column({ type: 'varchar', length: 4 })
  last4: string;

  @Column({ type: 'varchar', length: 50 })
  cardBrand: string;

  @Column({ type: 'varchar', length: 50, default: CardType.VISA })
  cardType: CardType;

  @Column({ type: 'varchar', length: 5 })
  expiryMonth: string;

  @Column({ type: 'varchar', length: 4 })
  expiryYear: string;

  @Column({ type: 'text' })
  encryptedCardToken: string; // Token from payment provider (Stripe/PayPal)

  @Column({ type: 'varchar', length: 50, default: CardStatus.ACTIVE })
  status: CardStatus;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  billingAddress: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  billingCity: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  billingState: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  billingZipCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  billingCountry: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

