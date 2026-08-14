import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from '../../entities/wallet.entity';
import { Transaction } from '../../entities/transaction.entity';
import { User } from '../../entities/user.entity';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { JwtService } from '../../common/services/jwt.service';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, Transaction, User])],
  controllers: [WalletController],
  providers: [WalletService, JwtService],
  exports: [WalletService],
})
export class WalletModule {}