import { z } from 'zod'

export const zGuideSchema = z.object({
  title:       z.string().min(1, 'Title is required').max(200),
  title_hy:    z.string().min(1, 'Armenian title is required').max(200),
  title_ru:    z.string().max(200).nullable().optional(),
  title_en:    z.string().max(200).nullable().optional(),
  subtitle:    z.string().max(500).nullable().optional(),
  subtitle_hy: z.string().max(500).nullable().optional(),
  subtitle_ru: z.string().max(500).nullable().optional(),
  subtitle_en: z.string().max(500).nullable().optional(),
  tag:         z.string().max(100).nullable().optional(),
  tag_hy:      z.string().max(100).nullable().optional(),
  tag_ru:      z.string().max(100).nullable().optional(),
  tag_en:      z.string().max(100).nullable().optional(),
  cover_url:   z.string().url('Must be a valid URL').nullable().optional(),
  sort_order:  z.number().int().min(0).default(0),
  venue_ids:   z.array(z.string().uuid()).default([]),
  is_active:   z.boolean().default(true),
})

export type GuideInput = z.infer<typeof zGuideSchema>
