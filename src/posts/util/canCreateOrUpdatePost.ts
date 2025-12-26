import { RolesEnum } from 'src/users/const/roles.const';

export function canCreateOrUpdatePost(
  postReadPermission: RolesEnum | null,
  userRole?: RolesEnum,
): boolean {
  // 로그인 안 했다면 생성이나 수정 불가
  if (!userRole) {
    return false;
  }

  // OWNER는 모든 글 수정/삭제 가능
  if (userRole === RolesEnum.OWNER) {
    return true;
  }

  // 전체공개글이면 누구나 수정/삭제 가능
  if (postReadPermission === null) {
    return true;
  }

  const roleHierarchy = {
    [RolesEnum.OWNER]: 3,
    [RolesEnum.ADMIN]: 2,
    [RolesEnum.USER]: 1,
  };

  // 사용자의 티어가 포스트 권한의 티어보다 크거나 같아야 수정/삭제 가능
  return roleHierarchy[userRole] >= roleHierarchy[postReadPermission];
}
