import { Injectable, Logger } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';

export interface RouteInfo {
  path: string;
  method: string;
  controller: string;
  methodName: string;
  fullPath: string;
  module: string;
  tags: string[];
}

@Injectable()
export class RouteScannerService {
  private readonly logger = new Logger(RouteScannerService.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Scan all routes in the application
   */
  scanRoutes(): RouteInfo[] {
    const routes: RouteInfo[] = [];

    try {
      // Get all controllers
      const controllers = this.discoveryService.getControllers();

      for (const controller of controllers) {
        const controllerInstance = controller.instance;
        const controllerClass = controller.metatype;

        if (!controllerInstance || !controllerClass) continue;

        const controllerPath =
          this.reflector.get<string>(PATH_METADATA, controllerClass) || '';

        // Get all methods from controller
        const methodNames = this.metadataScanner.getAllMethodNames(
          controllerInstance as object,
        );

        for (const methodName of methodNames) {
          const methodFunction =
            controllerInstance[methodName as keyof typeof controllerInstance];

          // Check if it's a function before proceeding
          if (typeof methodFunction !== 'function') continue;

          const method = this.reflector.get<string>(
            METHOD_METADATA,
            methodFunction,
          );

          if (method) {
            const routePath =
              this.reflector.get<string>(PATH_METADATA, methodFunction) || '';

            const fullPath = this.buildFullPath(controllerPath, routePath);
            const module = this.extractModuleName(controllerClass.name);
            const tags = this.extractTags(controllerClass.name, methodName);

            routes.push({
              path: routePath,
              method: method.toUpperCase(),
              controller: controllerClass.name,
              methodName,
              fullPath,
              module,
              tags,
            });
          }
        }
      }

      this.logger.log(`Discovered ${routes.length} routes`);
      return routes;
    } catch (error) {
      this.logger.error('Error scanning routes', error);
      return [];
    }
  }

  /**
   * Build full path from controller path and route path
   */
  private buildFullPath(controllerPath: string, routePath: string): string {
    if (!controllerPath && !routePath) return '/';
    if (!controllerPath) return `/${routePath}`;
    if (!routePath) return `/${controllerPath}`;

    return `/${controllerPath}/${routePath}`.replace(/\/+/g, '/');
  }

  /**
   * Extract module name from controller class name
   */
  private extractModuleName(controllerName: string): string {
    // Remove 'Controller' suffix and extract module name
    const moduleName = controllerName.replace(/Controller$/, '');

    // Convert PascalCase to kebab-case for better readability
    return moduleName
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
  }

  /**
   * Extract tags for grouping endpoints
   */
  private extractTags(controllerName: string, methodName: string): string[] {
    const tags: string[] = [];

    // Add controller-based tag
    const controllerTag = controllerName.replace(/Controller$/, '');
    tags.push(controllerTag);

    // Add method-based tags for better organization
    if (
      methodName.includes('Auth') ||
      methodName.includes('Login') ||
      methodName.includes('Register')
    ) {
      tags.push('Authentication');
    }

    if (methodName.includes('Verify') || methodName.includes('Email')) {
      tags.push('Email Verification');
    }

    if (methodName.includes('Password') || methodName.includes('Reset')) {
      tags.push('Password Management');
    }

    return tags;
  }

  /**
   * Get routes by module
   */
  getRoutesByModule(): Record<string, RouteInfo[]> {
    const routes = this.scanRoutes();
    const groupedRoutes: Record<string, RouteInfo[]> = {};

    for (const route of routes) {
      if (!groupedRoutes[route.module]) {
        groupedRoutes[route.module] = [];
      }
      groupedRoutes[route.module].push(route);
    }

    return groupedRoutes;
  }

  /**
   * Get routes by tag
   */
  getRoutesByTag(): Record<string, RouteInfo[]> {
    const routes = this.scanRoutes();
    const groupedRoutes: Record<string, RouteInfo[]> = {};

    for (const route of routes) {
      for (const tag of route.tags) {
        if (!groupedRoutes[tag]) {
          groupedRoutes[tag] = [];
        }
        groupedRoutes[tag].push(route);
      }
    }

    return groupedRoutes;
  }
}
