import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketStateMachine } from './engine/state-machine';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, TicketStateMachine],
  exports: [TicketsService, TicketStateMachine],
})
export class TicketsModule {}
