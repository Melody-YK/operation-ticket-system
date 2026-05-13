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
}
