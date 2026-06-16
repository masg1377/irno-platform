import { Module } from '@nestjs/common'
import { CertificatesService } from './certificates.service'
import { CertificatesController } from './certificates.controller'
import { CertificateTemplatesController } from './certificate-templates.controller'
import { CertificateRenderService } from './certificate-render.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [CertificatesController, CertificateTemplatesController],
  providers: [CertificatesService, CertificateRenderService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
