import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  TypeOrmHealthIndicator,
  HealthCheckService,
  HealthCheck,
} from '@nestjs/terminus';
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      async () => this.db.pingCheck('database', { timeout: 3000 }),
    ]);
  }
}

@Module({
  imports: [TerminusModule, TypeOrmModule],
  controllers: [HealthController],
})
export class HealthModule {}
