import {
  Controller,
  Get,
  Param,
  Delete,
  Post,
  Body,
  Patch,
  ParseIntPipe,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { plainToInstance } from 'class-transformer';
import { UserEntity } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { RolesEnum } from './const/roles.const';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { IsOwnerGuard } from 'src/auth/guards/is-owner.guard';
import { IsOwner } from 'src/auth/decorators/is-owner.decorator';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
// import { RequestWithUser } from 'types/user-request.interface';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { CurrentUserDto } from 'src/common/dto/current-user.dto';

@ApiBearerAuth()
@ApiTags('Users') // Swagger UI에서 그룹 이름
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get() // 200 OK
  @ApiOperation({
    summary: '모든 유저 조회',
    description: '모든 유저를 조회합니다.',
  })
  @ApiExcludeEndpoint()
  async findAllUser() {
    return await this.usersService.findAllUser();
  }

  // 유저 한 명 찾기
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({
    summary: '내 정보 조회',
    description: '로그인한 유저 자신의 정보를 조회합니다.',
  })
  async findMyProfile(@CurrentUser() user?: CurrentUserDto) {
    const userInfo = await this.usersService.findOneUserById(user.userId);

    return plainToInstance(UserEntity, userInfo);
  }

  // 유저 한 명 찾기
  @UseGuards(JwtAuthGuard)
  @Get(':id') // 200 OK
  @ApiOperation({
    summary: '특정 유저 조회',
    description: '특정 유저를 조회합니다.',
  })
  async findOneUserById(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOneUserById(id);

    return plainToInstance(UserEntity, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolesEnum.MEMBER)
  @Post() // 201 created
  @ApiOperation({
    summary: '새로운 유저 생성',
    description: '새로운 유저를 생성합니다.',
  })
  @ApiExcludeEndpoint()
  async createUser(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.createUser(createUserDto);
    return plainToInstance(UserEntity, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, IsOwnerGuard)
  @IsOwner('user')
  @Roles(RolesEnum.MEMBER, RolesEnum.GUEST)
  @Patch(':id')
  @ApiOperation({
    summary: '특정 유저 수정',
    description: '특정 유저 정보를 수정합니다.',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.usersService.updateUser(id, updateUserDto);
    return plainToInstance(UserEntity, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolesEnum.MEMBER)
  @HttpCode(204) // "성공했으면 됐지, 딱히 줄 건 없어" → 204. 바디는 따로 없어야 함.
  @Delete(':id')
  @ApiOperation({
    summary: '특정 유저 삭제',
    description: '특정 유저 정보를 삭제합니다.',
  })
  @ApiExcludeEndpoint()
  async removeUser(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.removeUser(id);
  }
}
