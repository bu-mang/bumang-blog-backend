import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { SignupAuthDto } from './dto/signup-auth.dto';
import * as bcrypt from 'bcrypt';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RolesEnum } from 'src/users/const/roles.const';
import { AppLoggerService } from 'src/logger/app-logger.service';
import { AuditService } from 'src/audit/audit.service';
import { RequestMeta } from 'src/common/util/request-meta.util';
import { UserEntity } from 'src/users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { RefreshSessionEntity } from './entities/refresh-session.entity';
import {
  ACCESS_TOKEN_TTL_SEC,
  MAX_SESSIONS_PER_USER,
  REFRESH_TOKEN_TTL_SEC,
} from './const/token.const';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly appLoggerService: AppLoggerService,
    private readonly auditService: AuditService,
    @InjectRepository(RefreshSessionEntity)
    private readonly sessionRepo: Repository<RefreshSessionEntity>,
  ) {}

  async signup(dto: SignupAuthDto) {
    const { email, nickname, password } = dto;

    // 이메일 조회
    const isEmailAvailable = await this.usersService.isEmailAvailable(email);
    if (!isEmailAvailable) {
      throw new ConflictException('User with this Email already exists');
    }

    // 닉네임 조회
    const isNicknameAvailable =
      await this.usersService.isNicknameAvailable(nickname);
    if (!isNicknameAvailable) {
      throw new ConflictException('User with this Nickname already exists');
    }

    const newUser = await this.usersService.createUser({
      email,
      nickname,
      role: RolesEnum.GUEST,
      password,
    });

    return { message: 'Sign-up successfully completed.', userId: newUser.id };
  }

  // 🔵 로그인 (Access + Refresh Token 발급)
  // meta: 감사 로그용 요청 정보(IP/국가/UA). 컨트롤러에서 Cloudflare 헤더로 추출해 전달.
  async login(dto: LoginAuthDto, meta?: RequestMeta) {
    const { email, password } = dto;
    const m: RequestMeta = meta ?? {
      ip: null,
      country: null,
      region: null,
      city: null,
      colo: null,
      referer: null,
      userAgent: null,
    };

    // ⚠️ validateOneUserPasswordByEmail은 계정이 없으면 null이 아니라 예외를 던진다.
    // 없는 계정 시도야말로 감사의 핵심이므로 여기서 잡아 기록하고 원래 예외를 다시 던진다.
    let user: UserEntity;
    try {
      user = await this.usersService.validateOneUserPasswordByEmail(email);
    } catch (err) {
      this.appLoggerService.logAuth(
        'login_user_not_found',
        undefined,
        email,
        false,
      );
      await this.auditService.recordLoginAttempt({
        email,
        userId: null,
        success: false,
        failureReason: 'user_not_found',
        ip: m.ip,
        country: m.country,
        region: m.region,
        city: m.city,
        colo: m.colo,
        userAgent: m.userAgent,
      });
      throw err;
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      this.appLoggerService.logAuth(
        'login_password_mismatch',
        user.id,
        email,
        false,
      );
      await this.auditService.recordLoginAttempt({
        email,
        userId: user.id,
        success: false,
        failureReason: 'password_mismatch',
        ip: m.ip,
        country: m.country,
        region: m.region,
        city: m.city,
        colo: m.colo,
        userAgent: m.userAgent,
      });
      throw new UnauthorizedException('Invalid Email or Password');
    }

    const accessToken = this.generateAccessToken(
      user.id,
      user.email,
      user.role,
    );
    // 이 기기의 세션을 새로 만든다. 다른 기기의 세션은 건드리지 않는다.
    const refreshToken = await this.createSession(user.id, m);

    this.appLoggerService.logAuth('login_success', user.id, email, true);
    await this.auditService.recordLoginAttempt({
      email,
      userId: user.id,
      success: true,
      failureReason: null,
      ip: m.ip,
      country: m.country,
      region: m.region,
      city: m.city,
      colo: m.colo,
      userAgent: m.userAgent,
    });

    return { accessToken, refreshToken, user };
  }

  // 🟡 access Token 재발급
  // refresh 토큰이 가리키는 세션이 살아 있으면 새 access 토큰을 주고 세션 만료를 연장한다.
  // 세션이 없거나 만료됐으면 null — 호출부가 401과 쿠키 삭제로 응답한다.
  //
  // refresh 토큰 자체는 바꾸지 않는다(로테이션 없음). 매번 바꾸면 새 토큰을 실은 응답이
  // 브라우저에 닿기 전에 취소됐을 때(Next 프리페치 등) 멀쩡한 세션이 끊긴다.
  async renewAccessToken(refreshToken: string) {
    const session = await this.sessionRepo.findOne({
      where: { tokenHash: this.hashToken(refreshToken) },
    });
    if (!session) return null;

    const now = new Date();
    if (session.expiresAt <= now) {
      await this.sessionRepo.delete(session.id);
      return null;
    }

    // 역할은 토큰이 아니라 DB의 현재 값으로 다시 읽는다 — 권한 변경이 다음 갱신에 반영된다.
    let user: UserEntity;
    try {
      user = await this.usersService.validateOneUserById(session.userId);
    } catch {
      await this.sessionRepo.delete(session.id);
      return null;
    }

    await this.sessionRepo.update(session.id, {
      lastUsedAt: now,
      expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_SEC * 1000),
    });

    return {
      accessToken: this.generateAccessToken(user.id, user.email, user.role),
    };
  }

  // 🔴 로그아웃 — 이 기기의 세션만 지운다. 토큰이 없거나 이미 지워졌어도 조용히 끝낸다.
  async logout(refreshToken?: string) {
    if (refreshToken) {
      await this.sessionRepo.delete({
        tokenHash: this.hashToken(refreshToken),
      });
    }

    return { message: 'logout successfully completed' };
  }

  // 만료된 세션 정리. TasksService의 자정 크론이 호출한다.
  async purgeExpiredSessions(): Promise<number> {
    const result = await this.sessionRepo.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected ?? 0;
  }

  // 새 세션을 만들고 refresh 토큰 원문을 돌려준다. 원문은 이 반환값으로만 존재하고
  // DB에는 해시만 남는다.
  private async createSession(
    userId: number,
    meta: RequestMeta,
  ): Promise<string> {
    const refreshToken = randomBytes(32).toString('base64url');
    const now = new Date();

    await this.sessionRepo.save(
      this.sessionRepo.create({
        userId,
        tokenHash: this.hashToken(refreshToken),
        lastUsedAt: now,
        expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_SEC * 1000),
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      }),
    );

    await this.trimSessions(userId);
    return refreshToken;
  }

  // 유저당 세션 수 상한. 넘으면 오래 안 쓴 것부터 지운다(로그인할 때마다 행이 쌓이는 것 방지).
  private async trimSessions(userId: number): Promise<void> {
    const stale = await this.sessionRepo.find({
      where: { userId },
      order: { lastUsedAt: 'DESC', id: 'DESC' },
      skip: MAX_SESSIONS_PER_USER,
      select: ['id'],
    });
    if (stale.length > 0) {
      await this.sessionRepo.delete(stale.map((s) => s.id));
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // 🔑 Access Token 생성
  private generateAccessToken(
    userId: number,
    email: string,
    role: RolesEnum,
  ): string {
    return this.jwtService.sign(
      {
        sub: userId,
        email,
        role,
      },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: ACCESS_TOKEN_TTL_SEC,
      },
    );
  }
}
