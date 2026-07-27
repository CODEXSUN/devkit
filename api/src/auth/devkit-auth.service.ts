import { AppError } from "@codexsun/framework/errors";
import type {
  DevkitLoginInput,
  DevkitLoginResult,
  DevkitUserRole,
} from "./devkit-auth.schemas.js";
import { DevkitAuthRepository } from "./devkit-auth.repository.js";
import { signDevkitToken } from "./devkit-auth.token.js";
import { verifyPassword } from "./password-hash.js";

export class DevkitAuthService {
  constructor(private readonly repository = new DevkitAuthRepository()) {}

  async login(input: DevkitLoginInput): Promise<DevkitLoginResult> {
    const email = input.email.trim().toLowerCase();
    const user = await this.repository.findByEmail(email);
    if (
      !user ||
      user.status !== "active" ||
      user.role !== "developer_admin" ||
      !(await verifyPassword(input.password, user.password_hash))
    ) {
      throw AppError.unauthorized("Invalid email or password.");
    }

    await this.repository.recordLogin(user.uuid);
    const role = user.role as DevkitUserRole;
    return {
      accessToken: signDevkitToken({
        email: user.email,
        name: user.name,
        role,
        userId: user.uuid,
      }),
      email: user.email,
      name: user.name,
      role,
      userType: "developer",
    };
  }
}
