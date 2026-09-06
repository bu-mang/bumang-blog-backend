export interface RequestMeta {
  ip: string | null;
  country: string | null;
  userAgent: string | null;
}

// 크롤러·자동화 클라이언트로 보이는 User-Agent.
// 감사 가치는 거의 없는데 볼륨은 사람 트래픽을 압도할 수 있어서 조회 로그에서 제외한다.
const BOT_UA_PATTERN =
  /(bot\b|bot\/|crawler|spider|crawling|slurp|mediapartners|facebookexternalhit|ia_archiver|feedfetcher|curl\/|wget\/|python-requests|python-urllib|okhttp|go-http-client|java\/|libwww-perl|headlesschrome|phantomjs|lighthouse|pingdom|uptimerobot|semrush|ahrefs|mj12|dotbot|petalbot|gptbot|claudebot|ccbot|bytespider)/i;

/**
 * 크롤러로 보이는 요청인가.
 *
 * ⚠️ User-Agent는 요청자가 마음대로 정하는 값이라 위장하면 그냥 통과한다.
 *    "정직한 크롤러를 걸러 볼륨을 줄이는" 용도지 방어 수단이 아니다 —
 *    악의적 폭주를 실제로 막는 건 중복 억제와 건수 캡 쪽이다.
 *
 * UA가 아예 없는 요청은 봇으로 단정하지 않는다(구형·프라이버시 클라이언트가 섞인다).
 */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return BOT_UA_PATTERN.test(userAgent);
}

// Cloudflare/nginx 뒤에서 실제 방문자 정보를 뽑는다.
// req.ip는 프록시 IP라 신뢰할 수 없으므로 Cloudflare 헤더를 우선한다.
export function extractRequestMeta(req: {
  headers: Record<string, any>;
  ip?: string;
}): RequestMeta {
  const headers = req.headers ?? {};

  const cfIp = headers['cf-connecting-ip'];
  const xff = headers['x-forwarded-for'];
  const firstXff =
    typeof xff === 'string' ? xff.split(',')[0].trim() : undefined;
  const ip = (cfIp || firstXff || req.ip || null) as string | null;

  // 국가는 Cloudflare가 붙여주는 CF-IPCountry(공짜·권위). 'XX'(미상)·'T1'(Tor) 등도 그대로.
  const rawCountry = headers['cf-ipcountry'];
  const country =
    typeof rawCountry === 'string' && rawCountry.length > 0 ? rawCountry : null;

  const ua = headers['user-agent'];
  const userAgent = typeof ua === 'string' && ua.length > 0 ? ua : null;

  return { ip, country, userAgent };
}
