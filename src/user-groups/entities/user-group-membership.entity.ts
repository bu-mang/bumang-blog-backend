import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { UserGroupEntity } from './user-group.entity';

@Entity()
export class UserGroupMembershipEntity {
  @PrimaryColumn()
  userId: number;

  @PrimaryColumn()
  groupId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @ManyToOne(() => UserGroupEntity, (group) => group.memberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'groupId' })
  group: UserGroupEntity;

  @CreateDateColumn()
  addedAt: Date;
}
