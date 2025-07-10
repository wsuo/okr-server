import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { User } from "../../entities/user.entity";
import { BcryptUtil } from "../../common/utils/bcrypt.util";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersRepository.findOne({
      where: { username },
      relations: ["roles", "department"],
    });

    if (user && (await BcryptUtil.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    if (!user) {
      throw new UnauthorizedException("用户名或密码错误");
    }

    if (user.status === 0) {
      throw new UnauthorizedException("账户已被禁用");
    }

    const payload = {
      sub: user.id,
      username: user.username,
      roles: user.roles?.map((role) => role.code) || [],
    };

    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, { expiresIn: "7d" });

    return {
      access_token,
      refresh_token,
      expires_in: 7200,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        department: user.department,
        roles: user.roles?.map((role) => role.code) || [],
        permissions: user.roles?.flatMap((role) => role.permissions) || [],
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken);
      const user = await this.usersRepository.findOne({
        where: { id: decoded.sub },
        relations: ["roles"],
      });

      if (!user || user.status === 0) {
        throw new UnauthorizedException("无效的刷新令牌");
      }

      const payload = {
        sub: user.id,
        username: user.username,
        roles: user.roles?.map((role) => role.code) || [],
      };

      return {
        access_token: this.jwtService.sign(payload),
        expires_in: 7200,
      };
    } catch (error) {
      throw new UnauthorizedException("无效的刷新令牌");
    }
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("用户不存在");
    }

    const isOldPasswordValid = await BcryptUtil.compare(
      changePasswordDto.oldPassword,
      user.password
    );

    if (!isOldPasswordValid) {
      throw new UnauthorizedException("原密码错误");
    }

    const hashedNewPassword = await BcryptUtil.hash(
      changePasswordDto.newPassword
    );
    await this.usersRepository.update(userId, { password: hashedNewPassword });

    return { message: "密码修改成功" };
  }

  async getProfile(userId: number) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ["roles", "department", "leader"],
      select: [
        "id",
        "username",
        "name",
        "email",
        "phone",
        "avatar",
        "position",
        "join_date",
      ],
    });

    if (!user) {
      throw new UnauthorizedException("用户不存在");
    }

    return {
      ...user,
      roles: user.roles?.map((role) => role.code) || [],
      permissions: user.roles?.flatMap((role) => role.permissions) || [],
    };
  }
}
