import { ApiProperty } from '@nestjs/swagger';
import { PostEntity } from '../entities/post.entity';
import { RolesEnum } from 'src/users/const/roles.const';

export class UpdatePostResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  categoryId: number;

  @ApiProperty()
  title: string;

  @ApiProperty({
    example: 'guest',
    enum: RolesEnum,
  })
  readPermission: RolesEnum;

  static fromEntity(post: PostEntity): UpdatePostResponseDto {
    const dto = new UpdatePostResponseDto();
    dto.id = post.id;
    dto.categoryId = post.category?.id ?? null;
    dto.title = post.title;
    dto.readPermission = post.readPermission;

    return dto;
  }
}
