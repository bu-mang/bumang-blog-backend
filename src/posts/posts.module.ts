import { forwardRef, Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostEntity } from './entities/post.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { TagsEntity } from 'src/tags/entities/tag.entity';
import { CategoryEntity } from 'src/categories/entities/category.entity';
import { CommentsModule } from 'src/comments/comments.module';
import { GroupEntity } from 'src/categories/entities/group.entity';
import { AppLoggerModule } from 'src/logger/app-logger.module';
import { UserGroupsModule } from 'src/user-groups/user-groups.module';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PostEntity,
      UserEntity,
      TagsEntity,
      CategoryEntity,
      GroupEntity,
    ]),
    forwardRef(() => CommentsModule),
    AppLoggerModule,
    UserGroupsModule,
    // AuditModule → AuthModule → PostsModule로 도는 순환을 forwardRef로 해소.
    forwardRef(() => AuditModule),
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
