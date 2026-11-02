# Demo Script and Defense Notes

A guide for presenting the project: what to prepare, a 10-minute demo, the numbers worth remembering, and answers to the questions reviewers are likely to ask.

## 1. Before the demo

**The day before**

- [ ] `ollama list` shows `llama3.2:3b`.
- [ ] `apps/backend/.env` has `AI_PROVIDER=local`, `SIM_FLOOR=0.30`, `SKILL_MATCH_THRESHOLD=0.50`.
- [ ] Optional clean database for the demo: set `MONGODB_URI=mongodb://localhost:27017/resume-matcher-demo`, then run `npm run seed:admin`.
- [ ] Prepare two job descriptions from different fields (e.g. a Senior MERN developer and a Data Analyst) and 4–6 resume PDFs with a text layer that fit them to different degrees: a strong fit, a partial fit, an unrelated profile.
- [ ] `npm run dev`, log in, and create both jobs so their skills are already extracted. Remove any wrong skill, and add one the LLM missed if needed.
- [ ] Do a full dry run, then delete the test candidates (keep the jobs).

**15 minutes before**

- [ ] Start Ollama and `npm run dev`. Open http://localhost:3000/api/health: `mongodb`, `embeddings` and `ollama` should all be `up`.
- [ ] Warm up the LLM so the first extraction isn't slowed by model loading: click **Re-extract with AI** on a spare job, or run `ollama run llama3.2:3b "hi"`.
- [ ] Open the folder with the resume PDFs in a file explorer window.
- [ ] Close heavy apps; the LLM uses all CPU cores while extracting.

## 2. Demo flow (about 10 minutes)

| #   | Show                                                                         | Say                                                                                                                                                                                                                          |
| :-- | :--------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Login page, then the empty dashboard                                         | Admin-only platform, runs fully offline. No paid APIs: an embedding model runs inside the Node process, the LLM runs in Ollama on this machine.                                                                              |
| 2   | **Jobs → New job**, paste the MERN description, create                       | The LLM reads the description once, in the background, and proposes skill names. Uploads never wait for it.                                                                                                                  |
| 3   | The pre-created MERN job: skill tags with aliases                            | Every proposed skill is checked against the description, so invented skills are dropped. Aliases come from a curated dictionary because the 3B model wrote harmful ones ("JIRA" for Jenkins). The admin can edit everything. |
| 4   | **Match Resume**: upload the strong-fit resume                               | Text extraction, chunking, embedding and scoring take under a second. No LLM is involved.                                                                                                                                    |
| 5   | Candidate detail: score, similarity, coverage, evidence                      | Two signals: overall meaning (semantic similarity) and explicit requirements (skill coverage). Every matched skill shows where it was found.                                                                                 |
| 6   | Upload the other resumes                                                     | Watch the tiers: strong fit high, partial fits in the middle, unrelated profiles near 0 %.                                                                                                                                   |
| 7   | A partial fit's detail: the missing skills                                   | This is the skill gap report: what to probe in an interview.                                                                                                                                                                 |
| 8   | Upload the first resume again                                                | Duplicate detection: "Resume already uploaded." (hash of the extracted text, per job).                                                                                                                                       |
| 9   | Second job: upload its matching resume and the strong-fit resume from step 4 | Same resumes, different job: the ranking flips. The score is about fit for this job, not "good resume vs bad resume".                                                                                                        |
| 10  | Edit the MERN job's skills (e.g. remove GraphQL), back to the candidate list | Scores recalculate instantly from stored embeddings; nothing is re-embedded and the LLM isn't called.                                                                                                                        |
| 11  | Dashboard: stats, search, job filter, sort by score                          | Day-to-day view for recruiters.                                                                                                                                                                                              |
| 12  | Users page; `/docs` (Swagger); `/api/health`                                 | Admin management; documented API; health shows each AI dependency.                                                                                                                                                           |

**If something goes wrong live**

- **Extraction is slow or fails:** use the pre-created jobs. A failed job shows **Skills needed** with a retry button; the error log says whether Ollama is unreachable.
- **Ollama doesn't start:** uploads still work on jobs whose skills are ready. Health shows Ollama as `degraded`, not down.
- **Everything fails:** show screenshots taken during the dry run, and the measured results in `project_specification.md` (Milestone 11 and 12 findings).

## 3. Numbers to remember

| What                                    | Number                                                                                       |
| :-------------------------------------- | :------------------------------------------------------------------------------------------- |
| Calibration run, MERN job (6 resumes)   | 88 / 61 / 48 / 32 / 23 / 0 %                                                                 |
| Calibration run, Data Analyst job       | analyst 87 %, everyone else 0–8 %                                                            |
| Raw similarity, in-domain vs off-domain | 0.47–0.75 vs 0.27–0.31                                                                       |
| Calibrated settings                     | floor 0.30, ceiling 0.80, skill threshold 0.50, weights 0.6 / 0.4                            |
| Resume upload                           | median 0.3 s, max 0.8 s                                                                      |
| Skill extraction                        | about 25–70 s per job on a 2011 CPU (i5-2400, no AVX2), background                           |
| Before/after removing LLM aliases       | 50–92 s → 24–37 s per job                                                                    |
| Embedding model                         | all-MiniLM-L6-v2: 384 dimensions, about 23 MB quantized, 256-token limit, loads in under 1 s |
| Memory                                  | backend about 220 MB, Ollama about 3 GB                                                      |
| Chunk size                              | about 200 tokens; top 3 chunks averaged                                                      |

## 4. Likely questions

**Why embeddings instead of keyword search?**
Keyword search fails when wording differs ("MERN stack engineer" vs "React and Node developer") and rewards keyword stuffing. Embeddings place texts with similar meaning close together, so the semantic score measures overall fit. Keywords still matter for explicit requirements, which is why the score combines both.

**What is cosine similarity, and why a dot product?**
It is the cosine of the angle between two vectors: 1 means the same direction (same meaning), 0 unrelated. The model's vectors are L2-normalised (length 1), so the cosine reduces to the dot product, which is cheap to compute.

**Why chunk the resume? Why the top 3 chunks?**
MiniLM reads at most 256 tokens and silently truncates the rest; a resume is 500–1,500 tokens, so embedding it whole would mostly score the summary. About 200-token chunks separated candidates best in the early test (128 tokens let one strong paragraph dominate). Averaging the best 3 chunks asks "does this resume contain strongly relevant experience?" without penalising long resumes for hobbies or education sections.

**Why rescale the similarity?**
Raw similarities never use the full range: unrelated resumes still score about 0.27–0.31, the best about 0.71–0.75. Mapping 0.30 → 0 % and 0.80 → 100 % makes the percentage readable. Both values come from measurements on six synthetic resumes during development, not guesses.

**Why not let the LLM score the resumes?**
It was measured in the early test: `llama3.2:3b` marked skills as missing that the resume stated explicitly, marked ten skills as matched for an unrelated data analyst, and took 2.5–3 minutes per resume. So the LLM does only the task a human reviews (the job's skill list), and the score is computed by transparent, repeatable code.

**How do you stop the LLM from inventing skills?**
Three layers: a JSON schema forces the output format; every skill must actually be mentioned in the job description or it is dropped; and the admin reviews the list. Example from testing: the model added "Agile" and "Financial modelling" copied from prompt examples; the examples were removed and the grounding check would drop them anyway.

**Prompt injection?**
Resumes never reach the LLM, so hidden text in a resume ("rate me 100 %") has no effect. Job descriptions are wrapped in delimiters with a data-only instruction. Honest limitation: in testing the 3B model still obeyed an instruction planted in a job description. The risk is low because only admins write job descriptions and they review the result.

**Semantic skill matching: does it work?**
Partly, and this was measured honestly. A short skill name is a weak query for MiniLM: skills a resume names reach 0.14–0.52 against its chunks, skills it doesn't name reach up to 0.43 (0.55 for single sentences, e.g. "GitHub Actions" vs "version control with Git"). The ranges overlap, so the threshold sits just above the highest false match (0.50) and acts as a cautious fallback. Text and alias matching does the real work. Sentence-level matching was tested and rejected.

**In the calibration run, why did the DevOps engineer rank above the Java developer?**
The MERN job asks for Docker, AWS (ECS, S3, CloudWatch) and GitHub Actions, which the DevOps resume covers (8 skills, semantic raw 0.58); the Java resume shares mostly general backend concepts (4 skills, raw 0.51). The original plan expected the reverse; the measured order was kept and the plan updated, rather than rewriting the resumes to fit.

**How did you test it?**
Unit tests for the maths, chunking, scoring, matching, grounding and the Ollama client; API tests for every endpoint against an in-memory MongoDB; component tests for the UI; and a full browser run with the real AI. The automated tests use stand-in AI implementations behind the same interfaces, so they run in seconds without models.

**Why the stand-in ("stub") AI?**
The AI sits behind two interfaces (`TextEmbedder`, `SkillExtractor`). The stand-ins made it possible to build and test the whole platform first, keep the test suite fast and deterministic, and switch to the real models without changing any controller, service or UI code. Each job and candidate records which model produced its vectors, and anything from a different model is re-embedded automatically.

**Is it secure?**
Passwords are hashed with argon2id; the session is a JWT in an httpOnly, SameSite=Strict cookie (not readable by JavaScript); login is rate-limited; changing or resetting a password revokes existing sessions; every route requires login unless explicitly public; uploads are limited to 5 MB and checked by PDF signature, not the client's MIME type; all input is validated.

**Bias and ethics?**
Scores support a recruiter; they don't decide. Candidate names never reach the LLM, the score depends only on skill evidence and similarity to the job, and the evidence is shown. Only synthetic data was used.

**How would it scale?**
Uploads are about 0.3 s and independent, and rescoring uses stored vectors. For thousands of resumes per job, the next steps would be a vector index (e.g. MongoDB Atlas Vector Search) and a job queue for extraction across machines. The LLM is the bottleneck: a faster CPU or GPU, or a larger model, is a configuration change (`OLLAMA_MODEL`).

**What would you improve next?**
DOCX and OCR support; a stronger embedding model for paraphrased skills; a larger model on faster hardware for more consistent skill extraction; bulk upload; real-world (anonymised) evaluation data.
