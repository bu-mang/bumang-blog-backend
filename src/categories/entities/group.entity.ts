import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CategoryEntity } from './category.entity';
import { TagsEntity } from 'src/tags/entities/tag.entity';

@Entity()
export class GroupEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
  })
  label: string;

  // 주소·코드 판정용 고정 키 (예: 'life'). 화면 이름(label)을 바꿔도 그대로 둔다.
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

  @OneToMany(() => CategoryEntity, (category) => category.group)
  categories: CategoryEntity[];

  @OneToMany(() => TagsEntity, (tag) => tag.group)
  tags: TagsEntity[];
}
