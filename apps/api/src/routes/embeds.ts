import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const embedFieldSchema = z.object({
  name: z.string().min(1).max(256),
  value: z.string().min(1).max(1024),
  inline: z.boolean().default(false),
});

const embedAuthorSchema = z.object({
  name: z.string().min(1).max(256),
  url: z.string().url().optional(),
  icon_url: z.string().url().optional(),
});

const embedFooterSchema = z.object({
  text: z.string().min(1).max(2048),
  icon_url: z.string().url().optional(),
});

const embedSchema = z.object({
  title: z.string().max(256).optional(),
  description: z.string().max(4096).optional(),
  color: z.number().int().min(0).max(0xffffff).optional(),
  url: z.string().url().optional(),
  timestamp: z.string().datetime().optional(),
  author: embedAuthorSchema.optional(),
  footer: embedFooterSchema.optional(),
  thumbnail: z.object({ url: z.string().url() }).optional(),
  image: z.object({ url: z.string().url() }).optional(),
  fields: z.array(embedFieldSchema).max(25).optional(),
});

export async function embedRoutes(app: FastifyInstance) {
  app.post('/preview', async (request, reply) => {
    const parsed = embedSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;
    const embed: Record<string, unknown> = {};

    if (data.title) embed.title = data.title;
    if (data.description) embed.description = data.description;
    if (data.color !== undefined) embed.color = data.color;
    if (data.url) embed.url = data.url;
    if (data.timestamp) embed.timestamp = data.timestamp;
    if (data.author) embed.author = data.author;
    if (data.footer) embed.footer = data.footer;
    if (data.thumbnail) embed.thumbnail = data.thumbnail;
    if (data.image) embed.image = data.image;
    if (data.fields) embed.fields = data.fields;

    const preview = {
      embeds: [embed],
      formattedJson: JSON.stringify({ embeds: [embed] }, null, 2),
      fieldCount: data.fields?.length ?? 0,
      totalCharacterCount:
        (data.title?.length ?? 0) +
        (data.description?.length ?? 0) +
        (data.fields?.reduce((sum, f) => sum + f.name.length + f.value.length, 0) ?? 0) +
        (data.footer?.text?.length ?? 0) +
        (data.author?.name?.length ?? 0),
    };

    return { data: preview };
  });

  app.post('/validate', async (request, reply) => {
    const parsed = embedSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        valid: false,
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;
    const warnings: string[] = [];

    if (!data.title && !data.description) {
      warnings.push('Embed should have at least a title or description');
    }

    const totalChars =
      (data.title?.length ?? 0) +
      (data.description?.length ?? 0) +
      (data.fields?.reduce((sum, f) => sum + f.name.length + f.value.length, 0) ?? 0) +
      (data.footer?.text?.length ?? 0) +
      (data.author?.name?.length ?? 0);

    if (totalChars > 6000) {
      warnings.push(`Total character count (${totalChars}) exceeds recommended limit of 6000`);
    }

    if (data.fields && data.fields.length > 25) {
      warnings.push('Embed has more than 25 fields');
    }

    return {
      valid: true,
      warnings,
      totalCharacterCount: totalChars,
    };
  });
}
