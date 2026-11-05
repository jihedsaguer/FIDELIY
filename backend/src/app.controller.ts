import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/health')
  getHealth(): { status: string; timestamp: string; phase: string } {
    return this.appService.getHealth();
  }

  @Get('/')
  getInfo(): { app: string; phase: string; status: string } {
    return this.appService.getInfo();
  }
}
