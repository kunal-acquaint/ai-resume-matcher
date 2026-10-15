import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { makePdf } from '../../../test/utils/make-pdf.js';
import { PdfTextExtractor } from './pdf-text-extractor.service.js';

const RESUME_LINES = [
  'Jane Doe - Senior Full-Stack Engineer',
  'Summary: 7 years building web applications with React, TypeScript and Node.js.',
  'Experience: Led the rebuild of an invoicing platform (React Query, NestJS, MongoDB).',
  'Skills: Docker, AWS, GitHub Actions, Jest, Vitest, PostgreSQL.',
];

describe('PdfTextExtractor', () => {
  const extractor = new PdfTextExtractor();

  it('extracts the text of a PDF, keeping line breaks', async () => {
    const text = await extractor.extract(makePdf(RESUME_LINES));

    expect(text.split('\n')).toEqual(RESUME_LINES);
  });

  it('rejects files that are not PDFs with 400', async () => {
    await expect(
      extractor.extract(Buffer.from('Just some text pretending to be a PDF')),
    ).rejects.toThrow(new BadRequestException('The file is not a valid PDF'));
  });

  it('rejects damaged PDFs with 400', async () => {
    await expect(
      extractor.extract(Buffer.from('%PDF-1.4\nthis is not a real document')),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects PDFs without a text layer with 422', async () => {
    await expect(extractor.extract(makePdf([]))).rejects.toThrow(UnprocessableEntityException);
    await expect(extractor.extract(makePdf(['Too short']))).rejects.toThrow(
      'No text layer found; OCR is not supported.',
    );
  });
});
