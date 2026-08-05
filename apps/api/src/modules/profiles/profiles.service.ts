import type { AreaCode, AppRole, Prisma } from '@prisma/client';
import type { MeResponse, UpdateProfile } from '@buy-nothing/contracts';
import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PublicApiException } from '../../common/http/public-api.exception';

type DatabaseClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string): Promise<MeResponse> {
    return this.meResponse(userId, this.prisma);
  }

  async updateProfile(
    userId: string,
    profile: UpdateProfile,
  ): Promise<MeResponse> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.profile.upsert({
        where: { userId },
        create: { userId, ...profile },
        update: profile,
      });
      return this.meResponse(userId, transaction);
    });
  }

  async updateRoles(userId: string, roles: AppRole[]): Promise<MeResponse> {
    const uniqueRoles = [...new Set(roles)];
    return this.prisma.$transaction(async (transaction) => {
      await transaction.roleAssignment.deleteMany({ where: { userId } });
      await transaction.roleAssignment.createMany({
        data: uniqueRoles.map((role) => ({ userId, role })),
        skipDuplicates: true,
      });
      const user = await transaction.user.findUniqueOrThrow({
        where: { id: userId },
        select: { activeRole: true },
      });
      if (user.activeRole && !uniqueRoles.includes(user.activeRole)) {
        await transaction.user.update({
          where: { id: userId },
          data: { activeRole: null },
        });
      }
      return this.meResponse(userId, transaction);
    });
  }

  async updateActiveRole(
    userId: string,
    activeRole: AppRole,
  ): Promise<MeResponse> {
    const assignment = await this.prisma.roleAssignment.findUnique({
      where: { userId_role: { userId, role: activeRole } },
      select: { role: true },
    });
    if (!assignment) {
      throw new PublicApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'ROLE_NOT_ASSIGNED',
        'Vai trò đang chọn chưa được đăng ký.',
      );
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { activeRole },
    });
    return this.meResponse(userId, this.prisma);
  }

  async updateAreas(userId: string, areas: AreaCode[]): Promise<MeResponse> {
    const uniqueAreas = [...new Set(areas)];
    return this.prisma.$transaction(async (transaction) => {
      const activeAreas = await transaction.area.findMany({
        where: { code: { in: uniqueAreas }, active: true },
        select: { code: true },
      });
      if (activeAreas.length !== uniqueAreas.length) {
        throw new PublicApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'AREA_UNAVAILABLE',
          'Khu vực không khả dụng.',
        );
      }
      await transaction.userArea.deleteMany({ where: { userId } });
      await transaction.userArea.createMany({
        data: uniqueAreas.map((areaCode) => ({ userId, areaCode })),
        skipDuplicates: true,
      });
      return this.meResponse(userId, transaction);
    });
  }

  private async meResponse(
    userId: string,
    database: DatabaseClient,
  ): Promise<MeResponse> {
    const user = await database.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        phoneLast4: true,
        phoneVerifiedAt: true,
        activeRole: true,
        profile: {
          select: { displayName: true, bio: true, avatarKey: true },
        },
        roleAssignments: {
          select: { role: true },
          orderBy: { role: 'asc' },
        },
        areaAssignments: {
          select: { areaCode: true },
          orderBy: { areaCode: 'asc' },
        },
      },
    });

    return {
      id: user.id,
      phoneVerified: user.phoneVerifiedAt !== null,
      phoneLast4: user.phoneLast4,
      profile: user.profile,
      roles: user.roleAssignments.map(({ role }) => role),
      activeRole: user.activeRole,
      areas: user.areaAssignments.map(({ areaCode }) => areaCode),
    };
  }
}
