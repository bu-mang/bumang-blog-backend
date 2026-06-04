import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserGroupsService } from './user-groups.service';
import { UserGroupsController } from './user-groups.controller';
import { UserGroupEntity } from './entities/user-group.entity';
import { UserGroupMembershipEntity } from './entities/user-group-membership.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserGroupEntity,
      UserGroupMembershipEntity,
      UserEntity,
    ]),
    AuthModule,
  ],
  controllers: [UserGroupsController],
  providers: [UserGroupsService],
  exports: [UserGroupsService],
})
export class UserGroupsModule {}
