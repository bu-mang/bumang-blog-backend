import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { IsSlug } from 'src/common/decorator/is-slug.decorator';

export class CreateTagDto {
  @ApiProperty({ example: 'React', description: '태그 이름' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'kubernetes',
    required: false,
    description:
      '주소용 고정 키 (소문자·숫자를 하이픈으로 이음, 최대 50자). 생략하면 이름에서 만든다. 이름을 고쳐도 따라 바뀌지 않는다.',
  })
  @IsOptional()
  @IsSlug()
  slug?: string;

  @ApiProperty({ example: 1, description: '소속 그룹 ID' })
  @IsNumber()
  @IsNotEmpty()
  groupId: number;
}
