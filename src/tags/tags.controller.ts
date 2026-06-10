import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { RolesEnum } from 'src/users/const/roles.const';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('tags') // Swagger UI에서 그룹 이름
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolesEnum.MEMBER)
  @Post()
  @ApiOperation({ summary: '태그 생성', description: '태그를 생성합니다.' })
  async create(@Body() createTagDto: CreateTagDto) {
    return await this.tagsService.createTag(createTagDto);
  }

  @Get()
  @ApiOperation({
    summary: '모든 태그 조회',
    description: '모든 태그를 조회합니다.',
  })
  async findAllTag() {
    return await this.tagsService.findAllTag();
  }

  @Get(':id')
  @ApiOperation({
    summary: '특정 태그 조회',
    description: '특정 태그를 조회합니다.',
  })
  async findOneTag(@Param('id', ParseIntPipe) id: number) {
    return await this.tagsService.findOneTag(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolesEnum.MEMBER)
  @Patch(':id')
  @ApiOperation({
    summary: '특정 태그 수정',
    description: '특정 태그를 수정합니다.',
  })
  async updateOneTag(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTagDto: UpdateTagDto,
  ) {
    return await this.tagsService.updateOneTag(id, updateTagDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolesEnum.MEMBER)
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: '특정 태그 삭제',
    description: '특정 태그를 삭제합니다.',
  })
  async removeOneTag(@Param('id', ParseIntPipe) id: number) {
    return await this.tagsService.removeOneTag(id);
  }
}
