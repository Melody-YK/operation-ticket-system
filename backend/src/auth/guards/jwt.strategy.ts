import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'ops-ticket-jwt-secret-dev-only',
    });
  }

  async validate(payload: { sub: string; name: string; role: string }) {
    const person = await this.prisma.personnel.findUnique({
      where: { personnelId: payload.sub },
    });
    if (!person) {
      throw new UnauthorizedException('用户不存在');
    }
    return {
      id: person.personnelId,
      name: person.name,
      role: person.role,
      team: person.team,
    };
  }
}