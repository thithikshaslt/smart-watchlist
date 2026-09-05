import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';

@Controller('users')
export class UsersController {
  @Get('me')
  me(@CurrentUser() currentUser: AuthenticatedUser): AuthenticatedUser {
    return currentUser;
  }
}
