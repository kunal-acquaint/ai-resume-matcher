import { CANDIDATE_LIMITS } from '@resume-matcher/shared';

export const RESUME_ACCEPT = 'application/pdf,.pdf';

/** Client-side check mirroring the backend's upload rules; returns an error message or undefined. */
export function validateResumeFile(file: File | null): string | undefined {
  if (!file) {
    return 'Choose a PDF resume to upload';
  }
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    return 'Only PDF files are allowed';
  }
  if (file.size > CANDIDATE_LIMITS.maxFileSize) {
    return 'The file is larger than 5 MB';
  }
  return undefined;
}
