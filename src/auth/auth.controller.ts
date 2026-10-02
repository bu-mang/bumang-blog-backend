import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { SignupAuthDto } from './dto/signup-auth.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import {
  ACCESS_TOKEN_MAX_AGE,
  getCookieOptions,
  REFRESH_TOKEN_MAX_AGE,
} from 'src/common/constant/cookieOption';
import { Throttle } from '@nestjs/throttler';
import { extractRequestMeta } from 'src/common/util/request-meta.util';

@ApiBearerAuth()
@ApiTags('Auth') // Swagger UI 그룹 이름
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 🟢 회원가입
  @Throttle({ default: { ttl: 60000, limit: 3 } }) // 무차별 가입 방지: 분당 3회 (전역 가드가 실IP 기준으로 센다)
  @Post('signup')
  @ApiOperation({ summary: '회원가입', description: '새로운 유저 회원가입' })
  async signup(@Body() dto: SignupAuthDto) {
    return await this.authService.signup(dto);
  }

  // 🔵 로그인 (Access + Refresh Token 발급, 204)
  @Throttle({ default: { ttl: 60000, limit: 5 } }) // 무차별 대입 방지: 분당 5회 (전역 가드가 실IP 기준으로 센다)
  @Post('login')
  @ApiOperation({ summary: '로그인', description: '서비스에 로그인합니다.' })
  async login(
    @Body() dto: LoginAuthDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(
      dto,
      extractRequestMeta(req),
    );
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = getCookieOptions(isProduction);

    // 쿠키 설정
    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    // ✅ 응답 반환 추가
    return { success: true, message: 'Login Success' };
  }

  // 🔴 로그아웃 (이 기기의 세션만 무효화)
  // 가드를 걸지 않는다 — access 토큰이 만료된 상태에서도 로그아웃은 돼야 하고,
  // 세션을 가리키는 건 refresh 토큰이다. 토큰이 없어도 쿠키는 지우고 성공으로 끝낸다.
  @Post('logout')
  @ApiOperation({
    summary: '로그아웃',
    description: '서비스에서 로그아웃합니다.',
  })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.logout(req.cookies?.refreshToken);
    this.clearAuthCookies(res);
    return result;
  }

  // 🟡 access Token 재발급
  // refresh 토큰(쿠키)이 가리키는 세션이 살아 있으면 새 access 토큰을 내려주고,
  // refresh 쿠키의 수명도 세션과 함께 연장한다.
  @Post('refresh')
  @ApiOperation({
    summary: '엑세스 토큰 갱신',
    description: '엑세스 토큰을 갱신하여 로그인을 지속시킵니다.',
  })
  async renewAccessToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken: string | undefined = req.cookies?.refreshToken;
    const renewed = refreshToken
      ? await this.authService.renewAccessToken(refreshToken)
      : null;

    if (!renewed) {
      this.clearAuthCookies(res);
      throw new UnauthorizedException('Session expired');
    }

    const cookieOptions = getCookieOptions(
      process.env.NODE_ENV === 'production',
    );
    res.cookie('accessToken', renewed.accessToken, {
      ...cookieOptions,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    return { success: true, message: 'Token refreshed' };
  }

  private clearAuthCookies(res: Response) {
    const cookieOptions = getCookieOptions(
      process.env.NODE_ENV === 'production',
    );
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
  }
}
