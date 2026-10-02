import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// 전역 레이트리밋 가드(app.module.ts에서 APP_GUARD로 등록).
//
// Cloudflare/nginx 뒤라 기본 ThrottlerGuard의 req.ip는 프록시 IP로 잡혀
// 레이트리밋이 "전역 공용 버킷"이 된다(사람별 격리 X, 공격자 1인이 전체 잠금 가능).
// 실제 방문자 IP(CF-Connecting-IP)를 트래커 키로 써서 사람별로 제한한다.
// 프론트 SSR이 내부 주소로 부를 때도 방문자의 CF-Connecting-IP를 넘겨주므로
// (front serverFetch·middleware) SSR 경유 요청도 방문자별로 센다.
@Injectable()
export class CfThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const headers = req.headers ?? {};
    const cfIp = headers['cf-connecting-ip'];
    const xff = headers['x-forwarded-for'];
    const firstXff =
      typeof xff === 'string' ? xff.split(',')[0].trim() : undefined;
    return cfIp || firstXff || req.ip;
  }
}
