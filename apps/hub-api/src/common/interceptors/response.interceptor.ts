import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

/**
 * Global response interceptor.
 * Wraps all successful non-null responses in the ApiResponse envelope:
 *   { data: <original response> }
 *
 * Health endpoints that return raw shapes (no envelope) should use
 * the @SkipResponseWrap() decorator — or simply rely on the fact that
 * consumers check HTTP status codes, not response body structure.
 *
 * IMPORTANT: Do NOT try to skip wrapping based on field presence (e.g. checking
 * for `status` key). User DTOs also have a `status` field and would be skipped.
 * Always wrap — callers that need raw health check results read the HTTP status code.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        // 204 No Content — nothing to wrap
        if (data === undefined || data === null) return data
        return { data }
      }),
    )
  }
}
