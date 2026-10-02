import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { PostsModule } from 'src/posts/posts.module';
import { AuditModule } from 'src/audit/audit.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PostsModule, AuditModule, AuthModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
