import { CurrentUserDto } from 'src/common/dto/current-user.dto';
import { RolesEnum } from 'src/users/const/roles.const';
import { IsNull } from 'typeorm';

// 권한 조건 설정 (목록 조회용)
export const getPermissionCondition = (currentUser: CurrentUserDto | null) => {
  if (!currentUser) {
    // 비로그인: 공개 포스트만 (OWNER 제외)
    return [{ readPermission: IsNull() }];
  } else if (currentUser.role === RolesEnum.GUEST) {
    // USER: 공개 + USER 권한 포스트만 (OWNER 제외)
    return [{ readPermission: IsNull() }, { readPermission: RolesEnum.GUEST }];
  } else if (currentUser.role === RolesEnum.MEMBER) {
    // ADMIN: 공개 + USER + ADMIN 권한 포스트 (OWNER 제외)
    return [
      { readPermission: IsNull() },
      { readPermission: RolesEnum.GUEST },
      { readPermission: RolesEnum.MEMBER },
    ];
  } else {
    // OWNER: 모든 포스트 (OWNER 포함)
    return [
      { readPermission: IsNull() },
      { readPermission: RolesEnum.GUEST },
      { readPermission: RolesEnum.MEMBER },
      { readPermission: RolesEnum.HOST },
    ];
  }
};
