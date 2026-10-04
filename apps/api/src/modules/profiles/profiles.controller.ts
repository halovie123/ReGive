import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import {
  UpdateActiveRoleSchema,
  UpdateAreasSchema,
  UpdateProfileSchema,
  UpdateRolesSchema,
  type MeResponse,
} from '@buy-nothing/contracts';
import { parseInput } from '../../common/http/parse-input';
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
      parseInput(UpdateProfileSchema, body),
    );
  }

  @Put('roles')
  updateRoles(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: unknown,
  ): Promise<MeResponse> {
    return this.profiles.updateRoles(
      currentUser.id,
      parseInput(UpdateRolesSchema, body).roles,
    );
  }

  @Put('active-role')
  updateActiveRole(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: unknown,
  ): Promise<MeResponse> {
    return this.profiles.updateActiveRole(
      currentUser.id,
      parseInput(UpdateActiveRoleSchema, body).activeRole,
    );
  }

  @Put('areas')
  updateAreas(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: unknown,
  ): Promise<MeResponse> {
    return this.profiles.updateAreas(
      currentUser.id,
      parseInput(UpdateAreasSchema, body).areas,
    );
  }
}
