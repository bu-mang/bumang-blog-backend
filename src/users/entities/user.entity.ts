import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RolesEnum } from '../const/roles.const';
import { PostEntity } from 'src/posts/entities/post.entity';
import { CommentEntity } from 'src/comments/entities/comment.entity';
import { Exclude } from 'class-transformer';

@Entity()
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 20,
    unique: true,
  })
  nickname: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude() // 응답에서 제외시켜주는 데코레이터.
  password: string;

  @Column({
    type: 'enum',
    enum: RolesEnum,
    default: RolesEnum.GUEST,
  })
  role: RolesEnum;

  @CreateDateColumn() //  생성이 되는 순간의 Date가 기록된다.
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 포스트
  @OneToMany(() => PostEntity, (post) => post.author)
  posts: PostEntity[];

  // 코멘트
  @OneToMany(() => CommentEntity, (comment) => comment.author)
  comments: CommentEntity[];

  @Column({ nullable: true })
  refreshToken: string;
}
