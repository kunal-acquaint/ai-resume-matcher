export interface DashboardStats {
  activeJobs: number;
  totalResumes: number;
  /** Resumes uploaded in the last 7 days. */
  resumesThisWeek: number;
  /** Mean final score (0..1) across all candidates; null when there are none. */
  averageScore: number | null;
}
