import { CategoryEntity } from 'src/categories/entities/category.entity';
import { CommentEntity } from 'src/comments/entities/comment.entity';
import { TagsEntity } from 'src/tags/entities/tag.entity';
import { RolesEnum } from 'src/users/const/roles.const';
import { UserEntity } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
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

  @DeleteDateColumn()
  deletedAt: Date | null;

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

  // 블록별 audience 매핑이 없을 때 fallback. 빈 배열 = 그룹 필터 없음(공개).
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  defaultAudienceGroupIds: number[];

  // BlockNote block.id → audience group id 배열. 키가 없으면 글 default를 따른다.
  // 빈 배열은 명시적 공개(글 default가 비공개여도 이 블록은 공개).
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  blockAudienceMap: Record<string, number[]>;

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
