import {
  Controller, Get, Post, Put, Body, Param, Query,
  UseGuards, Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { ReviewTicketDto } from './dto/review-ticket.dto';
import { ResubmitTicketDto } from './dto/resubmit-ticket.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { VerifyTicketDto } from './dto/verify-ticket.dto';
import { Roles } from '../auth/guards/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('tickets')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @Roles('OPERATOR')
  async create(@Body() dto: CreateTicketDto, @Req() req: any) {
    return this.ticketsService.create(dto, req.user.id);
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('operator_id') operatorId?: string,
    @Query('keyword') keyword?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.ticketsService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      operatorId,
      keyword,
      startDate,
      endDate,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Put(':id')
  @Roles('OPERATOR')
  async update(@Param('id') id: string, @Body() dto: UpdateTicketDto, @Req() req: any) {
    return this.ticketsService.update(id, dto, req.user.id);
  }

  @Post(':id/submit')
  @Roles('OPERATOR')
  async submit(@Param('id') id: string, @Req() req: any) {
    return this.ticketsService.submit(id, req.user.id);
  }

  @Post(':id/review')
  @Roles('SUPERVISOR', 'APPROVER', 'DISPATCHER')
  async review(@Param('id') id: string, @Body() dto: ReviewTicketDto, @Req() req: any) {
    return this.ticketsService.review(id, req.user.id, dto.action, dto.comment);
  }

  @Post(':id/dispatch')
  @Roles('DISPATCHER')
  async dispatch(@Param('id') id: string, @Req() req: any) {
    return this.ticketsService.dispatch(id, req.user.id);
  }

  @Post(':id/resubmit')
  @Roles('OPERATOR')
  async resubmit(@Param('id') id: string, @Body() dto: ResubmitTicketDto, @Req() req: any) {
    return this.ticketsService.resubmit(id, req.user.id);
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    return this.ticketsService.getStatusInfo(id);
  }

  // ===== 执行模块 =====

  @Post(':id/start-execute')
  @Roles('OPERATOR')
  async startExecute(@Param('id') id: string, @Req() req: any) {
    return this.ticketsService.startExecute(id, req.user.id);
  }

  @Put(':id/items/:itemId')
  @Roles('OPERATOR')
  async updateItemStatus(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
    @Req() req: any,
  ) {
    return this.ticketsService.updateItemStatus(id, itemId, req.user.id, dto.action);
  }

  @Post(':id/complete')
  @Roles('OPERATOR')
  async completeExecution(@Param('id') id: string, @Req() req: any) {
    return this.ticketsService.completeExecution(id, req.user.id);
  }

  @Post(':id/verify')
  @Roles('DISPATCHER')
  async verify(@Param('id') id: string, @Body() dto: VerifyTicketDto, @Req() req: any) {
    return this.ticketsService.verify(id, req.user.id, dto.action, dto.comment);
  }

  @Put(':id/media')
  @Roles('OPERATOR')
  async uploadMedia(@Param('id') id: string, @Body('data') mediaData: any, @Req() req: any) {
    return this.ticketsService.uploadMedia(id, req.user.id, mediaData);
  }

  @Get(':id/timeline')
  async getTimeline(@Param('id') id: string) {
    return this.ticketsService.getTimeline(id);
  }
}
