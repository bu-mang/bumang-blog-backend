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

  // 프로덕션 실제 컬럼은 character varying(varchar)로 생성돼 있다.
  // (마이그레이션 없이 옛 @Column() 추론으로 만들어진 잔재.)
  // 엔티티를 varchar로 맞춰야 dev의 synchronize가 컬럼을 재생성하지 않는다.
  @Column({ type: 'varchar', nullable: true })
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

  // BlockNote block.id → audience group id 배열.
  // 키가 없거나 빈 배열이면 그룹 필터 없음(공개).
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
