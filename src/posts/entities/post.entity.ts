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
  UpdateDateColumn,
} from 'typeorm';
import { PostTypeEnum } from '../const/type.const';

@Entity()
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
