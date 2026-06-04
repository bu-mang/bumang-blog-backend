import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesEnum } from 'src/users/const/roles.const';
import { UserGroupsService } from './user-groups.service';
import { CreateUserGroupDto } from './dto/create-user-group.dto';
import { UpdateUserGroupDto } from './dto/update-user-group.dto';
import { AddMemberDto } from './dto/add-member.dto';

@ApiBearerAuth()
@ApiTags('UserGroup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolesEnum.OWNER)
@Controller('user-groups')
export class UserGroupsController {
  constructor(private readonly service: UserGroupsService) {}

  @Get()
  @ApiOperation({ summary: '모든 유저 그룹 조회 [OWNER]' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '특정 유저 그룹 조회 [OWNER]' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '유저 그룹 생성 [OWNER]' })
  create(@Body() dto: CreateUserGroupDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '유저 그룹 수정 [OWNER]' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserGroupDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: '유저 그룹 삭제 [OWNER]' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: '그룹에 멤버 추가 [OWNER]' })
  addMember(@Param('id', ParseIntPipe) id: number, @Body() dto: AddMemberDto) {
    return this.service.addMember(id, dto.userId);
  }

  @Delete(':id/members/:userId')
  @HttpCode(204)
  @ApiOperation({ summary: '그룹에서 멤버 제거 [OWNER]' })
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.service.removeMember(id, userId);
  }
}
