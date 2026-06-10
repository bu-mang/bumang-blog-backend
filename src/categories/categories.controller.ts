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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesEnum } from 'src/users/const/roles.const';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiBearerAuth() // SWAGGER: 토큰 입력 가능
@ApiTags('Category') // Swagger UI에서 그룹 이름
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * @GROUPS
   */
  @Get('groups')
  @ApiOperation({
    summary: '모든 그룹 조회',
    description: '모든 그룹 데이터를 조회합니다.',
  })
  async findAllGroups() {
    return await this.categoriesService.findAllGroupRaw();
  }

  @Get('groups/menu')
  @ApiOperation({
    summary: '메뉴 구조 반환',
    description: '그룹과 카테고리의 트리구조를 반환합니다.',
  })
  async findGroupedCategoryTree() {
    return this.categoriesService.findGroupedCategoryTree();
  }

  @Get('groups/:id')
  @ApiOperation({
    summary: '특정 그룹 조회',
    description: '특정 그룹 데이터를 조회합니다.',
  })
  @ApiExcludeEndpoint() // 스웨거에 제외
  async findOneGroups(@Param('id', ParseIntPipe) id: number) {
    return await this.categoriesService.findOneGroup(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolesEnum.MEMBER)
  @Post('groups')
  @ApiOperation({
    summary: '새로운 그룹 생성 [ADMIN]',
    description: '특정 그룹 데이터를 조회합니다.',
  })
  @ApiExcludeEndpoint() // 스웨거에 제외
  async createOneGroup(@Body() { label, order = null }: CreateGroupDto) {
    return await this.categoriesService.createOneGroup({ label, order });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolesEnum.MEMBER)
  @Patch('groups')
  @ApiOperation({
    summary: '특정 그룹 업데이트 [ADMIN]',
    description: '특정 그룹 데이터를 업데이트합니다.',
  })
  @ApiExcludeEndpoint() // 스웨거에 제외
  async updateOneGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() { label, order = null }: UpdateGroupDto,
  ) {
    return await this.categoriesService.updateOneGroup(id, { label, order });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolesEnum.MEMBER)
  @Delete('groups/:id')
  @HttpCode(204)
  @ApiOperation({
    summary: '특정 그룹 삭제 [ADMIN]',
    description: '특정 그룹 데이터를 삭제합니다.',
  })
  @ApiExcludeEndpoint() // 스웨거에 제외
  async deleteOneGroup(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.deleteOneGroup(id);
  }

  /**
   * @CATEGORIES
   */
  @Get() // 200 OK
  @ApiOperation({
    summary: '모든 카테고리 조회',
    description: '모든 카테고리 데이터를 조회합니다.',
  })
  @ApiExcludeEndpoint() // 스웨거에 제외
  async findAllCategories() {
    return await this.categoriesService.findAllCategoryRaw();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolesEnum.MEMBER)
  @Post() // 201 created
  @ApiOperation({
    summary: '새로운 카테고리 생성 [ADMIN]',
    description: '새로운 카테고리 데이터를 생성합니다.',
  })
  @ApiExcludeEndpoint() // 스웨거에 제외
  async createOneCategory(
    @Body() { label, order = null, groupId = null }: CreateCategoryDto,
  ) {
    return await this.categoriesService.createOneCategory({
      label,
      order,
      groupId,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolesEnum.MEMBER)
  @Patch(':id')
  @ApiOperation({
    summary: '특정 카테고리 수정 [ADMIN]',
    description: '특정 카테고리 데이터를 수정합니다.',
  })
  @ApiExcludeEndpoint() // 스웨거에 제외
  async updateOneCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() { label, order, groupId }: UpdateCategoryDto,
  ) {
    return await this.categoriesService.updateOneCategory(id, {
      label,
      order,
      groupId,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolesEnum.MEMBER)
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: '특정 카테고리 삭제 [ADMIN]',
    description: '특정 카테고리 데이터를 삭제합니다.',
  })
  @ApiExcludeEndpoint() // 스웨거에 제외
  async deleteOneCategory(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.deleteOneCategory(id);
  }
}
