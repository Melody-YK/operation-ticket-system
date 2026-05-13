import { Controller, Get, Post, Body, Query, Param, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PersonnelService } from './personnel.service';
import { CreatePersonnelDto } from './dto/create-personnel.dto';
import { Roles } from '../auth/guards/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('personnel')
@UseGuards(AuthGuard('jwt'))
export class PersonnelController {
  constructor(private readonly personnelService: PersonnelService) {}

  @Get()
  async findAll(@Query('role') role?: string) {
    return this.personnelService.findAll(role);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.personnelService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async create(@Body() dto: CreatePersonnelDto) {
    return this.personnelService.create(dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async remove(@Param('id') id: string) {
    return this.personnelService.remove(id);
  }
}
