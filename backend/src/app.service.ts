import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  async healthCheck() {
    try {
      // 验证数据库连接
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        service: 'ops-ticket-backend',
        version: '0.1.0',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        service: 'ops-ticket-backend',
        version: '0.1.0',
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
