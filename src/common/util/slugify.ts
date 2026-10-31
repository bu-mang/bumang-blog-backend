import { BadRequestException } from '@nestjs/common';

/**
 * slug 규칙 — 블로그 안의 모든 slug(그룹·카테고리·태그·사용자 그룹)가 이 한 벌을 쓴다.
 * 프론트의 같은 규칙: bumang-blog-front/src/utils/slug.ts
 *
 * slug는 주소(`?category=architecture`)와 코드 판정(`slug === 'life'`)에 쓰는 고정 키다.
 * 화면 이름(label/title/name)은 언제든 바꿔도 되지만 slug는 한 번 정하면 바꾸지 않는다.
 * 그래서 이름을 고칠 때 slug를 따라 바꾸지 않는다 — 바꾸려면 slug를 명시해서 보낸다.
 *
 * - 소문자·숫자를 하이픈으로 잇는다. 하이픈은 단어 사이에만 하나씩 (`-a`, `a--b`, `a-` 불가)
 * - 최대 50자 (사용자 그룹 slug 칸이 DB에서 VARCHAR(50)이다)
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 50;
export const SLUG_RULE_MESSAGE =
  'slug는 소문자·숫자를 하이픈 하나로 이어 써야 합니다 (예: unity-csharp)';

/**
 * 영문 이름에서 slug를 만든다. 예: 'JavaScript & TypeScript' → 'javascript-typescript',
 * 'bumang.xyz' → 'bumang-xyz', 'Unity & C#' → 'unity-c'.
 * 영문·숫자가 하나도 없으면(한글 이름 등) 빈 문자열 — 호출하는 쪽에서 slug를 직접 받아야 한다.
 */
export function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * 만들 때의 slug를 정한다. 명시값이 우선이고(형식은 DTO가 검사), 없으면 이름에서 만든다.
 * 이름에 영문이 없거나 만든 slug가 너무 길면 400 — slug를 직접 달라고 한다.
 */
export function resolveSlug(name: string, slug?: string): string {
  if (slug) return slug;

  const generated = slugify(name);
  if (!generated) {
    throw new BadRequestException(
      'slug를 만들 수 없는 이름입니다. slug(소문자·숫자·하이픈)를 직접 지정해 주세요.',
    );
  }
  if (generated.length > SLUG_MAX_LENGTH) {
    throw new BadRequestException(
      `이름에서 만든 slug가 ${SLUG_MAX_LENGTH}자를 넘습니다. 더 짧은 slug를 직접 지정해 주세요.`,
    );
  }
  return generated;
}
