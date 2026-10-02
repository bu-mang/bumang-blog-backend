// 토큰 수명의 단일 출처. access JWT 만료·쿠키 maxAge·세션 만료가 전부 여기서 나온다.
// (예전엔 JWT 만료는 env, 쿠키 수명은 코드 상수로 따로 놀아 access 쿠키가 7일인데 토큰은
//  1시간인 식으로 어긋나 있었다.)

// access 토큰: 짧게. 탈취돼도 이 시간 안에만 유효하고, 역할 변경도 이 시간 안에 반영된다.
export const ACCESS_TOKEN_TTL_SEC = 15 * 60;

// refresh 세션: 마지막으로 쓴 시점부터 이 기간. 갱신할 때마다 연장된다(슬라이딩).
export const REFRESH_TOKEN_TTL_SEC = 30 * 24 * 60 * 60;

// 유저당 동시에 유지하는 세션(기기) 수. 넘으면 오래 안 쓴 것부터 지운다.
export const MAX_SESSIONS_PER_USER = 10;
