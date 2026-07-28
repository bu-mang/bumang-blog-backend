export interface RequestMeta {
  ip: string | null;
  country: string | null;
  userAgent: string | null;
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
