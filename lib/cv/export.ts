// One entry point for both formats: stored content in, file out, plus the report of anything left out. Nothing is stored anywhere.
import type { PortfolioContent } from '@/components/templates/Minimal'
import { buildCvModel, type CvReport } from './model'
import { renderPdf } from './pdf'
import { renderDocx } from './docx'

export type CvFormat = 'pdf' | 'docx'
export const isCvFormat = (v: unknown): v is CvFormat => v === 'pdf' || v === 'docx'

export const CV_MIME: Record<CvFormat, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export interface CvFile { buffer: Buffer; contentType: string; filename: string; report: CvReport }

/** "ada-okonkwo-cv.pdf": lower-case ASCII, safe in a Content-Disposition header. */
export function cvFilename(name: string, format: CvFormat): string {
  const base = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
  return `${base || 'portfolio'}-cv.${format}`
}

export async function exportCv(
  content: Partial<PortfolioContent> | null | undefined,
  format: CvFormat,
  opts: { includeContact: boolean; url?: string; now?: Date },
): Promise<CvFile> {
  const { model, report } = buildCvModel(content, opts)
  const buffer = format === 'pdf' ? await renderPdf(model) : await renderDocx(model)
  return { buffer, contentType: CV_MIME[format], filename: cvFilename(model.name, format), report }
}
