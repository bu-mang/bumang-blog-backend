import { PostEntity } from 'src/posts/entities/post.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { GroupEntity } from './group.entity';

@Unique(['group', 'order'])
@Entity()
export class CategoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
  })
  label: string;

  // 주소용 고정 키 (예: 'architecture'). 화면 이름(label)을 바꿔도 그대로 둔다.
  @Column({
    unique: true,
  })
  slug: string;

  @Column({
    nullable: false,
  })
  order: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => GroupEntity, (group) => group.categories)
  @JoinColumn()
  group: GroupEntity;

  // set null은 post 엔티티 쪽에서.
  @OneToMany(() => PostEntity, (post) => post.category)
  posts: PostEntity[];
}
