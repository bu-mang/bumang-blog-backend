import { GroupEntity } from 'src/categories/entities/group.entity';
import { PostEntity } from 'src/posts/entities/post.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class TagsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  title: string;

  // 주소용 고정 키 (예: 'kubernetes'). 화면 이름(title)을 바꿔도 그대로 둔다.
  @Column({ unique: true })
  slug: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToMany(() => PostEntity, (post) => post.tags)
  posts: PostEntity[];

  @ManyToOne(() => GroupEntity, (group) => group.tags)
  @JoinColumn()
  group: GroupEntity;
}
