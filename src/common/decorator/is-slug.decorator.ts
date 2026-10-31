import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength } from 'class-validator';
import {
  SLUG_MAX_LENGTH,
  SLUG_PATTERN,
  SLUG_RULE_MESSAGE,
} from 'src/common/util/slugify';

/** slug 형식 검사 — 규칙은 src/common/util/slugify.ts 한 곳. 생략 가능하게 하려면 @IsOptional()과 같이 쓴다. */
export const IsSlug = () =>
  applyDecorators(
    IsString(),
    MaxLength(SLUG_MAX_LENGTH, {
      message: `slug는 ${SLUG_MAX_LENGTH}자까지 쓸 수 있습니다`,
    }),
    Matches(SLUG_PATTERN, { message: SLUG_RULE_MESSAGE }),
  );
