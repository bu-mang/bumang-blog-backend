// optional-jwt-auth.guard.ts
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// 로그인 여부와 무관하게 통과시키는 가드(공개 글 + 권한 글이 섞인 조회용).
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, _info: any, context: ExecutionContext) {
    if (user) return user;

    // access 토큰은 없거나 만료됐는데 refresh 쿠키는 있다 = "로그인한 사람인데 access만
    // 만료된" 상태다. 여기서 익명으로 통과시키면 로그인한 사용자에게 가려진(마스킹된)
    // 익명용 응답이 나가고, 401이 아니라서 클라이언트는 갱신할 기회도 얻지 못한다.
    // 401로 알려서 갱신 후 다시 요청하게 한다. (세션이 실제로 죽어 있으면 갱신이 쿠키를
    // 지우므로, 그다음 요청은 아래의 익명 경로로 들어온다.)
    const req = context.switchToHttp().getRequest();
    if (req.cookies?.refreshToken) {
      throw new UnauthorizedException('Access token expired');
    }

    // 쿠키가 아예 없는 익명 방문자
    return user;
  }
}
