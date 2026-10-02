// src/interceptors/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
// import { MetricsService } from 'src/metrics/metrics.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    // private readonly metricsService: MetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, ip } = request;

    const startTime = Date.now();

    this.logger.info(`[REQUEST] ${method} ${url} - IP: ${ip}`);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;
        // const durationSeconds = duration / 1000;

        this.logger.info(
          `[RESPONSE] ${method} ${url} - ${statusCode} - ${duration}ms`,
        );

        // Prometheus 메트릭 (꺼 둠 — app.module.ts 주석 참고)
        // ⚠️ 다시 켤 때 라벨에 url을 그대로 넣지 말 것. prom-client는 라벨 조합마다
        //    시계열을 만들어 프로세스가 죽을 때까지 들고 있어서, 쿼리스트링이 붙은 URL을
        //    넣으면 고유 URL 수만큼 메모리가 자란다. 라우트 패턴('/posts/:id')을 쓴다.
        // const route = request.route?.path ?? 'unknown';
        // this.metricsService.incrementHttpRequests(method, route, statusCode);
        // this.metricsService.observeHttpDuration(method, route, durationSeconds);
      }),
    );
  }
}
