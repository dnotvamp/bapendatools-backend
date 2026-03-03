import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
<<<<<<< HEAD
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
=======
>>>>>>> 902deeabc8a5a76b7ce0824ce7a82266bcd9c8f9

@Module({
  controllers: [AppController],
  providers: [AppService],
<<<<<<< HEAD
  imports: [PrismaModule, AuthModule],
=======
>>>>>>> 902deeabc8a5a76b7ce0824ce7a82266bcd9c8f9
})
export class AppModule {}
