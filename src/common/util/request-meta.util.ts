export interface RequestMeta {
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  colo: string | null;
  referer: string | null;
  userAgent: string | null;
}

// DB 컬럼 길이.
const PLACE_MAX_LENGTH = 128;
const REFERER_MAX_LENGTH = 512;

// Cloudflare 위치 헤더(CF-Region·CF-IPCity)를 읽는다. 대략적인 값이고 비어 있을 수 있다.
// Node는 헤더 바이트를 latin1으로 읽으므로 UTF-8 지명(São Paulo 등)은 되돌려 해석한다.
function readPlaceHeader(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  return Buffer.from(raw, 'latin1').toString('utf8').slice(0, PLACE_MAX_LENGTH);
}

// CF-Ray("a4443d65f85d9a6b-LAX")의 꼬리표가 요청을 받은 Cloudflare 엣지(IATA 공항 코드)다.
// 한국 방문자가 서울(ICN)이 아니라 해외 엣지(LAX 등)로 빠지는 비율을 보려고 남긴다.
function readColo(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const colo = raw.split('-').pop()?.toUpperCase() ?? '';
  return /^[A-Z]{3}$/.test(colo) ? colo : null;
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

  // 시/도·도시는 Cloudflare Managed Transforms "Add visitor location headers"가 붙여준다.
  // 예전엔 geoip-lite로 도시를 직접 조회했는데, 그 라이브러리가 IP DB 전체(약 210MB)를
  // 메모리에 올려 컨테이너 한도(384MB)를 꽉 채웠다.
  const region = readPlaceHeader(headers['cf-region']);
  const city = readPlaceHeader(headers['cf-ipcity']);

  const colo = readColo(headers['cf-ray']);

  // 유입 경로. SSR 요청이면 프론트가 방문자의 원래 Referer를 이어 넘긴다.
  const rawReferer = headers['referer'];
  const referer =
    typeof rawReferer === 'string' && rawReferer.length > 0
      ? rawReferer.slice(0, REFERER_MAX_LENGTH)
      : null;

  const ua = headers['user-agent'];
  const userAgent = typeof ua === 'string' && ua.length > 0 ? ua : null;

  return { ip, country, region, city, colo, referer, userAgent };
}
