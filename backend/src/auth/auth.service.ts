import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(personnelId: string, password: string) {
    // 查找人员
    const person = await this.prisma.personnel.findUnique({
      where: { personnelId },
    });

    if (!person) {
      throw new UnauthorizedException('人员信息不存在');
    }

    // 生产环境应使用密码校验，开发环境简化
    // TODO: MVP 后加入真实密码校验

    // 生成 JWT
    const payload = {
      sub: person.personnelId,
      name: person.name,
      role: person.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: person.personnelId,
        name: person.name,
        role: person.role,
        team: person.team,
      },
    };
  }

  async validateUser(payload: { sub: string; role: string }) {
    const person = await this.prisma.personnel.findUnique({
      where: { personnelId: payload.sub },
    });
    if (!person) {
      throw new UnauthorizedException('用户不存在');
    }
    return person;
  }
}