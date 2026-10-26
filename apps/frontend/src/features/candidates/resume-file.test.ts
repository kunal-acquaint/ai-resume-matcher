import { CANDIDATE_LIMITS } from '@resume-matcher/shared';
import { validateResumeFile } from './resume-file';

const pdf = (name = 'resume.pdf', size = 10, type = 'application/pdf') => {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('validateResumeFile', () => {
  it('accepts a PDF by MIME type or extension', () => {
    expect(validateResumeFile(pdf())).toBeUndefined();
    expect(validateResumeFile(pdf('RESUME.PDF', 10, ''))).toBeUndefined();
  });

  it('requires a file', () => {
    expect(validateResumeFile(null)).toBe('Choose a PDF resume to upload');
  });

  it('rejects other file types', () => {
    expect(validateResumeFile(pdf('resume.docx', 10, 'application/msword'))).toBe(
      'Only PDF files are allowed',
    );
  });

  it('rejects files over 5 MB', () => {
    expect(validateResumeFile(pdf('big.pdf', CANDIDATE_LIMITS.maxFileSize + 1))).toBe(
      'The file is larger than 5 MB',
    );
    expect(validateResumeFile(pdf('max.pdf', CANDIDATE_LIMITS.maxFileSize))).toBeUndefined();
  });
});
