import { FastifyInstance } from 'fastify';
import { prisma } from '@ones-panel/database';
import { z } from 'zod';

const brandingSchema = z.object({
  panelName: z.string().optional(),
  companyName: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
  faviconUrl: z.string().nullable().optional(),
  loginLogoUrl: z.string().nullable().optional(),
  dashboardLogoUrl: z.string().nullable().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  backgroundImageUrl: z.string().nullable().optional(),
  loginBackgroundUrl: z.string().nullable().optional(),
  loadingScreenUrl: z.string().nullable().optional(),
  browserTitle: z.string().optional(),
  footerText: z.string().optional(),
  supportUrl: z.string().nullable().optional(),
  discordUrl: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  docsUrl: z.string().nullable().optional(),
  socialLinks: z.record(z.unknown()).optional(),
  emailBranding: z.record(z.unknown()).optional(),
  notificationBranding: z.record(z.unknown()).optional(),
});

export async function brandingRoutes(app: FastifyInstance) {
  // Get branding (public)
  app.get('/', async () => {
    let branding = await prisma.branding.findFirst();
    if (!branding) {
      branding = await prisma.branding.create({
        data: {
          id: 'default',
          panelName: 'ONES PANEL',
          companyName: 'Ones Panel',
        },
      });
    }
    return branding;
  });

  // Update branding
  app.put('/', async (request, reply) => {
    if (!request.user || !['OWNER', 'ADMIN'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const body = brandingSchema.parse(request.body);
    
    let branding = await prisma.branding.findFirst();
    if (!branding) {
      branding = await prisma.branding.create({
        data: {
          id: 'default',
          ...body,
        } as any,
      });
    } else {
      branding = await prisma.branding.update({
        where: { id: branding.id },
        data: body as any,
      });
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'UPDATE',
        resource: 'branding',
        resourceId: branding.id,
        details: body as any,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
      },
    });

    return branding;
  });
}
