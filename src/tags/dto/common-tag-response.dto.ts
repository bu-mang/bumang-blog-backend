import { ApiProperty } from '@nestjs/swagger';
import { TagsEntity } from '../entities/tag.entity';
import { InternalServerErrorException } from '@nestjs/common';

export class CommonTagResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty({ example: 'kubernetes', description: '주소용 고정 키' })
  slug: string;

  @ApiProperty()
  group: {
    id: number;
    label: string;
    slug: string;
  };

  static fromEntity(tag: TagsEntity): CommonTagResponseDto {
    if (!tag.group) {
      throw new InternalServerErrorException('Tag must have a group');
    }

    const dto = new CommonTagResponseDto();
    dto.id = tag.id;
    dto.title = tag.title;
    dto.slug = tag.slug;
    dto.group = {
      id: tag.group.id,
      label: tag.group.label,
      slug: tag.group.slug,
    };

    return dto;
  }
}
