import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePersonnelDto } from './dto/create-personnel.dto';

@Injectable()
export class PersonnelService {
  constructor(private prisma: PrismaService) {}

  async findAll(role?: string) {
    const where: any = {};
    if (role) where.role = role;
    return this.prisma.personnel.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const person = await this.prisma.personnel.findUnique({
      where: { personnelId: id },
    });
    if (!person) {
      throw new NotFoundException('人员信息不存在');
    }
    return person;
  }

  async create(dto: CreatePersonnelDto) {
    return this.prisma.personnel.create({
      data: dto as any,
    });
  }

  async remove(id: string) {
    const person = await this.findOne(id);
    return this.prisma.personnel.delete({
      where: { personnelId: id },
    });
  }
}
