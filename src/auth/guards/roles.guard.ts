// NestJS에서 Guard를 만들 때 필요한 기본 의존성들
import {
  CanActivate, // Guard가 되기 위해 구현해야 할 인터페이스
  ExecutionContext, // 현재 요청 컨텍스트 (req, handler, class 등 정보 포함)
  Injectable, // Nest의 DI 시스템에 등록하기 위한 데코레이터
  ForbiddenException, // 권한이 없을 때 던지는 예외 클래스
} from '@nestjs/common';

import { Reflector } from '@nestjs/core'; // 데코레이터 메타데이터를 읽기 위한 Nest 제공 유틸

import { ROLES_KEY } from '../decorators/roles.decorator'; // @Roles() 데코레이터에서 설정한 메타데이터 키, export const ROLES_KEY = 'roles';
import { RolesEnum } from 'src/users/const/roles.const'; // 역할 정의 enum (ex: ADMIN, USER)

// Nest의 DI 컨테이너에 이 클래스를 등록해서 주입 가능하게 만듦
@Injectable()
export class RolesGuard implements CanActivate {
  // Reflector는 데코레이터에 설정된 메타데이터를 읽어올 수 있게 도와주는 도구
  constructor(private readonly reflector: Reflector) {}

  // 요청이 이 핸들러로 들어올 수 있는지를 결정하는 메서드 (true = 통과, false = 거부)
  canActivate(context: ExecutionContext): boolean {
    // @Roles() 데코레이터에 설정된 역할 정보를 가져옴
    // context.getHandler() → 현재 요청된 메서드
    // context.getClass()   → 현재 컨트롤러 클래스
    const requiredRoles = this.reflector.getAllAndOverride<RolesEnum[]>(
      ROLES_KEY, // 'roles' 메타데이터 키
      [context.getHandler(), context.getClass()], // 우선순위: 메서드 → 클래스
    );

    // 만약 @Roles() 데코레이터가 없거나 빈 배열이면 권한 검사하지 않고 통과시킴
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 현재 요청 객체(request) 추출
    const request = context.switchToHttp().getRequest();

    // 인증된 사용자 정보 가져오기 (JwtStrategy의 validate()에서 설정된 user)
    const user = request.user;

    // 인증 정보 자체가 없다면 예외 발생 (보통 인증 Guard가 먼저 실행되므로 거의 없음)
    if (!user) {
      throw new ForbiddenException('There is no validated User Information.');
    }

    // 역할 계층 구조 정의: 높은 숫자 = 높은 권한
    const roleHierarchy = {
      [RolesEnum.OWNER]: 3,
      [RolesEnum.ADMIN]: 2,
      [RolesEnum.USER]: 1,
    };

    // 사용자의 권한 레벨
    const userLevel = roleHierarchy[user.role];

    // 요구되는 역할 중 최소 레벨 찾기 (가장 낮은 권한)
    const minRequiredLevel = Math.min(
      ...requiredRoles.map((role) => roleHierarchy[role]),
    );

    // 사용자 레벨이 요구 레벨 이상이면 통과
    if (userLevel >= minRequiredLevel) {
      return true;
    }

    // 권한 부족
    throw new ForbiddenException('Cannot access without Authorization.');
  }
}
