import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { SwaggerController } from './swagger.controller';
import { DocumentationService } from './services/documentation.service';
import { RouteScannerService } from './services/route-scanner.service';
import { ResponseExampleService } from './services/response-example.service';
import { SwaggerConfigService } from './config/swagger.config';

@Module({
  imports: [DiscoveryModule],
  controllers: [SwaggerController],
  providers: [
    DocumentationService,
    RouteScannerService,
    ResponseExampleService,
  ],
})
export class SwaggerModule {}
