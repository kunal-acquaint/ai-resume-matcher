import { BadRequestException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { extractText, getDocumentProxy } from 'unpdf';

/** Fewer characters than this means the PDF has no usable text layer (e.g. a scan). */
export const MIN_RESUME_TEXT_LENGTH = 200;
/** Upper bound on stored text; far beyond any real resume. */
export const MAX_RESUME_TEXT_LENGTH = 100_000;

const PDF_SIGNATURE = '%PDF-';

@Injectable()
export class PdfTextExtractor {
  /**
   * Extracts the text of a PDF. Throws 400 for files that are not PDFs and
   * 422 for PDFs without a text layer (OCR is out of scope).
   */
  async extract(file: Buffer): Promise<string> {
    // Check the file's magic bytes; the client-supplied MIME type can't be trusted.
    if (file.subarray(0, PDF_SIGNATURE.length).toString('latin1') !== PDF_SIGNATURE) {
      throw new BadRequestException('The file is not a valid PDF');
    }

    let text: string;
    try {
      const document = await getDocumentProxy(new Uint8Array(file));
      ({ text } = await extractText(document, { mergePages: true }));
    } catch {
      throw new BadRequestException('The PDF could not be read. It may be damaged or encrypted.');
    }

    const cleaned = text
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (cleaned.length < MIN_RESUME_TEXT_LENGTH) {
      throw new UnprocessableEntityException('No text layer found; OCR is not supported.');
    }
    return cleaned.slice(0, MAX_RESUME_TEXT_LENGTH);
  }
}
