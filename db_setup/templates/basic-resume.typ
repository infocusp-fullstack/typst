// =============================================================================
// INFOCUSP RESUME TEMPLATE
// For detailed guidelines on how to craft your resume, visit:
// https://handbook.infocusp.com/docs/how-tos/resume-build
// =============================================================================

#import "@preview/basic-resume:0.2.8": *

// ---------------------------------------------------------------------------
// PERSONAL INFORMATION
// Replace the values below with your own details.
// NOTE: Use your @infocusp.com email address only. Do NOT include personal email.
// Phone number is intentionally omitted per company guidelines.
// ---------------------------------------------------------------------------
#let name = "Stephen Xu"
#let location = "San Diego, CA"
#let email = "stephen.xu@infocusp.com"
#let github = "github.com/stuxf"
#let linkedin = "linkedin.com/in/stuxf"
#let phone = "+1 (xxx) xxx-xxxx"
#let personal-site = "stuxf.dev"

#show: resume.with(
  author: name,
  location: location,
  email: email,
  github: github,
  linkedin: linkedin,
  // phone: phone,               // Phone is intentionally hidden per Infocusp guidelines
  personal-site: personal-site,
  accent-color: "#26428b",
  font: "New Computer Modern",
  paper: "us-letter",
  author-position: left,
  personal-info-position: left,
)

// =============================================================================
// SECTION ORDER (do not change the order of sections):
//   1. Profile
//   2. Skills
//   3. Work Experience  (newest → oldest)
//   4. Projects         (optional — personal/hobby/open-source only)
//   5. Education        (most recent degree first)
// =============================================================================


// -----------------------------------------------------------------------------
// 1. PROFILE
// A concise 2–3 line summary highlighting your experience, core skills, and
// the value you bring. Tailor this to the role you are applying for.
// -----------------------------------------------------------------------------
== Profile

Machine Learning Engineer with 3+ years of experience building and deploying end-to-end AI/ML solutions across healthcare and enterprise domains. Skilled in designing scalable data pipelines, developing production-grade deep learning models, and translating complex business problems into measurable outcomes. Adept at collaborating with cross-functional teams to deliver high-impact products that drive operational efficiency and growth.


// -----------------------------------------------------------------------------
// 2. SKILLS
// Group skills into logical categories relevant to your role.
// Focus on tools you use professionally and can confidently discuss.
// -----------------------------------------------------------------------------
== Skills

- *Programming Languages*: Python, C++, Java, Bash, SQL
- *ML / AI Frameworks*: TensorFlow, PyTorch, scikit-learn, Hugging Face Transformers, LangChain
- *Data Engineering*: Apache Spark, Airflow, Pandas, NumPy
- *Databases*: PostgreSQL, MongoDB, Redis, Pinecone
- *Cloud & DevOps*: Google Cloud Platform (Vertex AI, BigQuery), AWS (SageMaker, S3), Docker, Kubernetes, GitHub Actions


// -----------------------------------------------------------------------------
// 3. WORK EXPERIENCE  (newest → oldest)
//
// For each role — especially Infocusp projects — focus on:
//   • The generic problem you solved (no client names or confidential data)
//   • Your specific technical contribution and ownership
//   • The measurable impact delivered to the product or business
//
// Bullets should read as achievements, not a list of tasks or tools.
// -----------------------------------------------------------------------------
== Work Experience

#work(
  title: "Senior Machine Learning Engineer",
  location: "Mountain View, CA",
  company: "Infocusp Innovations",
  dates: dates-helper(start-date: "Jan 2022", end-date: "Present"),
)
- Architected and deployed a real-time document intelligence platform for an enterprise client in the financial services sector, reducing manual document processing time by 70% and enabling straight-through processing for 85% of incoming documents.
- Led development of a large-scale recommendation engine serving millions of users, improving click-through rate by 18% and average session duration by 12% through contextual embedding models and A/B-tested ranking strategies.
- Designed an MLOps pipeline on GCP (Vertex AI + Cloud Run) for automated model retraining and versioning, cutting deployment cycles from two weeks to under 48 hours and improving model freshness across all production systems.
- Mentored a team of three junior engineers through weekly design reviews, establishing coding and documentation standards that reduced post-deployment bugs by 40%.

#work(
  title: "Machine Learning Engineer",
  location: "Mountain View, CA",
  company: "Infocusp Innovations",
  dates: dates-helper(start-date: "Jul 2020", end-date: "Dec 2021"),
)
- Built an NLP-based clinical text extraction system that structured unstructured medical notes at scale, reducing analyst effort by approximately 60 hours per week for the client team.
- Developed a time-series forecasting module for a supply chain client, improving demand forecast accuracy by 22% (MAPE) and contributing directly to a 15% reduction in overstocking costs.
- Migrated a fragmented batch pipeline to a streaming architecture using Apache Kafka and Spark, achieving sub-minute data latency for critical business dashboards.


// -----------------------------------------------------------------------------
// 4. PROJECTS  (Optional)
// Include only personal, hobby, or open-source projects built outside of
// employment. Keep to your most impactful project(s).
// -----------------------------------------------------------------------------
== Projects

#project(
  name: "OpenMedNER",
  role: "Creator & Maintainer",
  dates: dates-helper(start-date: "Mar 2023", end-date: "Present"),
  url: "github.com/stuxf/openmedner",
)
- Built and open-sourced a Named Entity Recognition toolkit fine-tuned on biomedical corpora, achieving state-of-the-art F1 scores on standard benchmarks (CoNLL-2003, BC5CDR); adopted by 300+ researchers globally within six months of release.
- Containerised the inference service with Docker and published a REST API, reducing integration effort for downstream users from days to under an hour.


// -----------------------------------------------------------------------------
// 5. EDUCATION  (most recent degree first)
// -----------------------------------------------------------------------------
== Education

#edu(
  institution: "Harvey Mudd College",
  location: "Claremont, CA",
  dates: dates-helper(start-date: "Aug 2016", end-date: "May 2020"),
  degree: "Bachelor's of Science, Computer Science and Mathematics",
)
- Cumulative GPA: 3.8 / 4.0
- Relevant Coursework: Machine Learning, Statistical Inference, Algorithms & Data Structures, Database Systems, Computer Networks, Linear Algebra, Probability Theory

// -----------------------------------------------------------------------------
// END OF TEMPLATE
// -----------------------------------------------------------------------------
