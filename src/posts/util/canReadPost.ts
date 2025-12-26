import { RolesEnum } from 'src/users/const/roles.const';

export function canReadPost(
  postReadPermission: RolesEnum | null,
  userRole?: RolesEnum | null,
): boolean {
  console.log(userRole, postReadPermission, 'userRole, postReadPermission');

  // 공개 포스트는 누구나 읽기 가능
  if (!postReadPermission) {
    return true;
  }

  // 비로그인 사용자는 권한이 필요한 포스트 읽기 불가
  if (!userRole) {
    return false;
  }

  // 역할 계층 구조: 높은 숫자 = 높은 권한
  const roleHierarchy = {
    [RolesEnum.OWNER]: 3,
    [RolesEnum.ADMIN]: 2,
    [RolesEnum.USER]: 1,
  };

  // 사용자의 티어가 포스트 권한의 티어보다 크거나 같으면 읽기 가능
  return roleHierarchy[userRole] >= roleHierarchy[postReadPermission];
}
