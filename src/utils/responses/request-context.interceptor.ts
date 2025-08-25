import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

declare module 'http' {
  interface IncomingHttpHeaders {
    'x-request-id'?: string;
  }
}

export interface ResponseWithMeta<T = unknown> {
  body: T;
  __meta?: { request_id: string; execution_time: number };
}

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { startTime?: number }>();
    const start = Date.now();
    request.startTime = start;

    const requestId =
      request.headers['x-request-id'] &&
      typeof request.headers['x-request-id'] === 'string'
        ? request.headers['x-request-id']
        : randomUUID();

    return next.handle().pipe(
      map((data: unknown) => {
        const execution_time = Date.now() - start;
        // Support builders that will read metadata from here
        if (typeof data === 'object' && data !== null) {
          (
            data as { __meta?: { request_id: string; execution_time: number } }
          ).__meta = {
            request_id: requestId,
            execution_time,
          };
          return data;
        }
        const wrapped: ResponseWithMeta = {
          body: data,
          __meta: { request_id: requestId, execution_time },
        };
        return wrapped;
      }),
    );
  }
}
