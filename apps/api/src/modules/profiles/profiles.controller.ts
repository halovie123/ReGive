import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  UpdateActiveRoleSchema,
  UpdateAreasSchema,
  UpdateProfileSchema,
  UpdateRolesSchema,
  type MeResponse,
} from '@buy-nothing/contracts';
import type { z } from 'zod';
import { PublicApiException } from '../../common/http/public-api.exception';
import { CurrentUser } from '../identity/current-user.decorator';
import type { CurrentUser as AuthenticatedUser } from '../identity/identity.types';
import { JwtAuthGuard } from '../identity/jwt-auth.guard';
import { ProfilesService } from './profiles.service';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get()
  getMe(@CurrentUser() currentUser: AuthenticatedUser): Promise<MeResponse> {
    return this.profiles.getMe(currentUser.id);
  }

  @Put('profile')
  updateProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: unknown,
  ): Promise<MeResponse> {
    return this.profiles.updateProfile(
      currentUser.id,
      this.parse(UpdateProfileSchema, body),
    );
  }

  @Put('roles')
  updateRoles(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: unknown,
  ): Promise<MeResponse> {
    return this.profiles.updateRoles(
      currentUser.id,
      this.parse(UpdateRolesSchema, body).roles,
    );
  }

  @Put('active-role')
  updateActiveRole(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: unknown,
  ): Promise<MeResponse> {
    return this.profiles.updateActiveRole(
      currentUser.id,
      this.parse(UpdateActiveRoleSchema, body).activeRole,
    );
  }

  @Put('areas')
  updateAreas(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: unknown,
  ): Promise<MeResponse> {
    return this.profiles.updateAreas(
      currentUser.id,
      this.parse(UpdateAreasSchema, body).areas,
    );
  }

  private parse<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
    const result = schema.safeParse(body);
    if (result.success) return result.data;
    throw new PublicApiException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'INVALID_INPUT',
      'Dữ liệu không hợp lệ.',
    );
  }
}
