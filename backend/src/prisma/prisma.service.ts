import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    console.log('📦 Prisma 数据库连接已建立');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('📦 Prisma 数据库连接已断开');
  }
}