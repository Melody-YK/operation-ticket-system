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

@Controller('tickets')
@UseGuards(AuthGuard('jwt'))
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
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
  async update(@Param('id') id: string, @Body() dto: UpdateTicketDto, @Req() req: any) {
    return this.ticketsService.update(id, dto, req.user.id);
  }

  @Post(':id/submit')
  async submit(@Param('id') id: string, @Req() req: any) {
    return this.ticketsService.submit(id, req.user.id);
  }

  @Post(':id/review')
  async review(@Param('id') id: string, @Body() dto: ReviewTicketDto, @Req() req: any) {
    return this.ticketsService.review(id, req.user.id, dto.action, dto.comment);
  }

  @Post(':id/dispatch')
  async dispatch(@Param('id') id: string, @Req() req: any) {
    return this.ticketsService.dispatch(id, req.user.id);
  }

  @Post(':id/resubmit')
  async resubmit(@Param('id') id: string, @Body() dto: ResubmitTicketDto, @Req() req: any) {
    return this.ticketsService.resubmit(id, req.user.id);
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    return this.ticketsService.getStatusInfo(id);
  }

  // ===== 执行模块 =====

  @Post(':id/start-execute')
  async startExecute(@Param('id') id: string, @Req() req: any) {
    return this.ticketsService.startExecute(id, req.user.id);
  }

  @Put(':id/items/:itemId')
  async updateItemStatus(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
    @Req() req: any,
  ) {
    return this.ticketsService.updateItemStatus(id, itemId, req.user.id, dto.action);
  }

  @Post(':id/complete')
  async completeExecution(@Param('id') id: string, @Req() req: any) {
    return this.ticketsService.completeExecution(id, req.user.id);
  }

  @Post(':id/verify')
  async verify(@Param('id') id: string, @Body() dto: VerifyTicketDto, @Req() req: any) {
    return this.ticketsService.verify(id, req.user.id, dto.action, dto.comment);
  }

  @Put(':id/media')
  async uploadMedia(@Param('id') id: string, @Body('data') mediaData: any, @Req() req: any) {
    return this.ticketsService.uploadMedia(id, req.user.id, mediaData);
  }

  @Get(':id/timeline')
  async getTimeline(@Param('id') id: string) {
    return this.ticketsService.getTimeline(id);
  }
}
