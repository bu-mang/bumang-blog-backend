import { CategoryEntity } from 'src/categories/entities/category.entity';
import { CommentEntity } from 'src/comments/entities/comment.entity';
import { TagsEntity } from 'src/tags/entities/tag.entity';
import { RolesEnum } from 'src/users/const/roles.const';
import { UserEntity } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { PostTypeEnum } from '../const/type.const';

@Entity()
@Unique('UQ_post_entity_client_request_id', ['clientRequestId'])
export class PostEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  previewText: string;

  @Column({ type: 'text', nullable: true })
  thumbnailUrl: string;

  // 클라이언트가 생성 요청마다 부여하는 멱등 키.
  // 같은 키로 다시 생성 요청이 오면 새로 만들지 않고 기존 글을 반환한다.
  // (nullable + unique → Postgres는 NULL 중복을 허용하므로 기존 데이터에 영향 없음)
  @Column({ type: 'uuid', nullable: true })
  clientRequestId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.posts)
  author: UserEntity;

  @Column({
    type: 'enum',
    enum: PostTypeEnum,
    default: PostTypeEnum.DEV,
  })
  type: PostTypeEnum;

  @Column({
    type: 'enum',
    enum: RolesEnum,
    nullable: true,
  })
  readPermission: RolesEnum | null;

  @ManyToOne(() => CategoryEntity, (category) => category.posts, {
    onDelete: 'SET NULL', // ✅ 이쪽에 넣어야 DB에서 제대로 동작
    nullable: true,
  })
  @JoinColumn()
  category: CategoryEntity;

  @OneToMany(() => CommentEntity, (comment) => comment.post)
  comments: CommentEntity[];

  @ManyToMany(() => TagsEntity, (tag) => tag.posts, { cascade: true })
  @JoinTable()
  tags: TagsEntity[];

  @Column({ default: 0 })
  likes: number;

  @Column({ default: 0 })
  view: number;
}
