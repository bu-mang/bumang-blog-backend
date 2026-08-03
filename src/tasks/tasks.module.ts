import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { PostsModule } from 'src/posts/posts.module';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  imports: [PostsModule, AuditModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
