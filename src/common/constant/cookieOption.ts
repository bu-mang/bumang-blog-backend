import {
  ACCESS_TOKEN_TTL_SEC,
  REFRESH_TOKEN_TTL_SEC,
} from 'src/auth/const/token.const';

// 공통 쿠키 옵션을 상수로 정의
// 쿠키 옵션 헬퍼 메서드
function getCookieOptions(isProduction: boolean = false) {
  return {
    httpOnly: true,
    secure: isProduction,
    // sameSite: isProduction ? ('none' as const) : ('lax' as const), // 0801
    sameSite: 'lax' as const,
    domain: isProduction ? 'bumang.xyz' : undefined, // 서브도메인 공유
    path: '/',
  };
}

// 쿠키 수명은 토큰 수명과 같게 둔다 — 쿠키가 살아 있으면 토큰도 살아 있다.
const ACCESS_TOKEN_MAX_AGE = ACCESS_TOKEN_TTL_SEC * 1000;
const REFRESH_TOKEN_MAX_AGE = REFRESH_TOKEN_TTL_SEC * 1000;

export { getCookieOptions, ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_MAX_AGE };
