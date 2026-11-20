// Content for the "portfolio for <role>" landing pages (/portfolio-for/<slug>). Every page is written for its role: what a hiring person looks for,
// what to put in when there is little experience, headline examples and common mistakes. No statistics and no claims about outcomes.
import type { SampleKind } from '@/lib/blocks/sample'

export interface RoleFaq { q: string; a: string }

export interface RolePage {
  slug: string
  /** "software developers" */
  plural: string
  /** The invented sample portfolio shown on the page. */
  kind: SampleKind
  title: string
  description: string
  h1: string
  intro: string
  show: string[]
  ideas: string[]
  headlines: string[]
  mistakes: string[]
  faq: RoleFaq[]
}

export const ROLE_PAGES: readonly RolePage[] = [
  {
    slug: 'software-developers',
    plural: 'software developers',
    kind: 'engineer',
    title: 'Portfolio Website for Software Developers | LivePortfolio',
    description: 'A developer portfolio that shows real projects, your stack and the results. Start from your CV or GitHub, preview free, and publish at your own address.',
    h1: 'A portfolio website for software developers',
    intro: 'A hiring manager reading a developer portfolio is asking one question: can this person ship? A list of languages does not answer it. A few projects, each with the problem, what you built and what changed, does.',
    show: [
      'Two to four projects, each with the problem it solved, how you built it and the result.',
      'The stack for each project, not one giant skills list for the whole page.',
      'A link to the live project and to the code, where you can share them.',
      'Numbers you can stand behind: users, requests handled, time saved, bugs removed.',
      'Your GitHub and LinkedIn, and one clear way to contact you.',
    ],
    ideas: [
      'A small tool you built for yourself or a friend, with a live link.',
      'A bootcamp or course project, rebuilt with one real improvement you chose.',
      'A bug fix or documentation change merged into an open-source project.',
    ],
    headlines: [
      'Backend developer who builds payment systems that stay up.',
      'Frontend developer focused on fast, accessible interfaces.',
      'Full-stack developer building tools small businesses actually use.',
    ],
    mistakes: [
      'Listing twenty technologies and showing none of them at work.',
      'Showing tutorial projects that look the same as everyone else\'s.',
      'Saying "built a website" without saying for whom or what it did.',
    ],
    faq: [
      { q: 'Do I need a portfolio if I have a GitHub profile?', a: 'GitHub shows code; a portfolio explains it. Most people reviewing applications will not read your repositories, so a short page that says what each project is and why it matters gets your work seen.' },
      { q: 'How many projects should a developer portfolio have?', a: 'Two to four good ones beat ten thin ones. Pick the projects that best show the kind of work you want to be hired for.' },
      { q: 'Can I start from my CV or GitHub?', a: 'Yes. You can import your CV or your GitHub profile, or type your details in, then edit everything before you publish.' },
    ],
  },
  {
    slug: 'data-analysts',
    plural: 'data analysts and data scientists',
    kind: 'engineer',
    title: 'Portfolio Website for Data Analysts & Scientists | LivePortfolio',
    description: 'Show your analysis, not just your tools. A portfolio for data analysts and data scientists with projects, findings and results. Preview free.',
    h1: 'A portfolio website for data analysts and data scientists',
    intro: 'Data work is hard to judge from a CV. A portfolio lets a reader see how you frame a question, handle messy data and explain a finding to someone who does not code. That is the skill most teams are hiring for.',
    show: [
      'Each project as a question, the data you used, your method and the finding, in plain language.',
      'One chart or dashboard image per project, so the result is visible at a glance.',
      'Where the data came from and what you did to clean it.',
      'A decision or action your analysis supported, even in a small team or a course.',
      'Links to notebooks, dashboards or reports, if you can share them.',
    ],
    ideas: [
      'Analyse a public dataset about something you care about and write up three findings.',
      'Build a dashboard for a small business or student group and explain the choices.',
      'Redo an analysis you saw published and note where your result differs.',
    ],
    headlines: [
      'Data analyst who turns messy sales data into decisions a team can act on.',
      'Data scientist building forecasting models for retail and logistics.',
      'Analyst with a finance background, fluent in SQL and Python.',
    ],
    mistakes: [
      'Showing code with no finding: a reader wants the answer first.',
      'Using only famous practice datasets, like the Titanic or iris data.',
      'Leaving out the business question, so the chart means nothing.',
    ],
    faq: [
      { q: 'What should a data analyst portfolio include?', a: 'A handful of projects that each state the question, the method and the result in plain words, with a visual for each. Tools matter less than showing you can reach a clear conclusion.' },
      { q: 'Can I show private company data?', a: 'No, and you should not. Use public data, anonymise heavily with permission, or describe the work and its result without the numbers that are not yours to share.' },
      { q: 'Do I need a website, or is a notebook link enough?', a: 'Notebooks are good evidence but hard to skim. A portfolio page that summarises each project and links to the notebook serves both the busy reader and the careful one.' },
    ],
  },
  {
    slug: 'product-managers',
    plural: 'product managers',
    kind: 'engineer',
    title: 'Portfolio Website for Product Managers | LivePortfolio',
    description: 'Show the products you shaped, the decisions you made and what changed. A product manager portfolio you can preview free and publish when ready.',
    h1: 'A portfolio website for product managers',
    intro: 'Product work is mostly invisible: decisions, trade-offs, conversations. A portfolio makes it visible. Show the problem, what you chose and why, and what happened afterwards, and you answer the questions interviewers will ask anyway.',
    show: [
      'Two or three product stories: the problem, the options you weighed and the call you made.',
      'The outcome, with a number where you have one, and what you would do differently.',
      'Your role on each: what you owned and what the team owned.',
      'A screenshot, a flow or a one-page spec, if you may share it.',
      'The kinds of teams and products you have worked with, in a sentence.',
    ],
    ideas: [
      'A teardown of a product you use, with three changes you would make and why.',
      'A side project you shipped, with your first ten users and what you learned.',
      'A process you improved in a past role, written up as a product problem.',
    ],
    headlines: [
      'Product manager who takes fintech products from first idea to first thousand users.',
      'Product manager for marketplaces, focused on trust and repeat use.',
      'Former engineer turned product manager, strong on discovery and delivery.',
    ],
    mistakes: [
      'Listing responsibilities instead of decisions and outcomes.',
      'Claiming the whole result when a team produced it.',
      'Hiding the things that did not work: honest lessons are persuasive.',
    ],
    faq: [
      { q: 'What goes in a product manager portfolio?', a: 'Short case studies: the problem, your decision, the result and what you learned. Two or three well told stories are enough.' },
      { q: 'I cannot share company details. What can I show?', a: 'Describe the problem and your approach without confidential figures, or use a side project or a teardown. Interviewers care about how you think.' },
      { q: 'Is a portfolio expected for a product role?', a: 'Not always, but it sets you apart from applicants who only send a CV, and it gives you something concrete to point to in an interview.' },
    ],
  },
  {
    slug: 'ui-ux-designers',
    plural: 'UI and UX designers',
    kind: 'designer',
    title: 'Portfolio Website for UI/UX Designers | LivePortfolio',
    description: 'A clean portfolio for UI and UX designers: case studies, process and results, on a page that is fast on any phone. Preview free.',
    h1: 'A portfolio website for UI and UX designers',
    intro: 'A design portfolio is judged twice: once on the work, and once on how well it is presented. Case studies that explain your thinking, on a page that loads fast and reads well on a phone, show both.',
    show: [
      'Two or three case studies, each with the problem, who it was for, your role and the result.',
      'Your process in a few steps: research, ideas, testing, what changed after feedback.',
      'Real screens, large enough to read, with a sentence on why each decision was made.',
      'What you did versus what the team did, stated plainly.',
      'A short bio and a clear way to contact you.',
    ],
    ideas: [
      'Redesign one flow of an app you use, and explain the problem you found.',
      'Design a small tool for a local business or club and test it with five people.',
      'Take a past project and show the version before and after what you learned.',
    ],
    headlines: [
      'Product designer making complex financial tools feel simple.',
      'UX designer focused on research and accessible design.',
      'UI designer with a graphic design background and an eye for detail.',
    ],
    mistakes: [
      'Beautiful screens with no explanation of the problem.',
      'Too many projects, so none gets enough room.',
      'Heavy files that load slowly on mobile data.',
    ],
    faq: [
      { q: 'How many case studies should a UX portfolio have?', a: 'Two to three thorough ones. Quality and clarity of thinking matter more than quantity.' },
      { q: 'Can I show work from a bootcamp?', a: 'Yes, if you are clear that it is a course project and you show your own decisions. Add a self-initiated project to show initiative.' },
      { q: 'Will my images look sharp?', a: 'Yes. Project images are saved at high resolution and you can fit a whole screenshot or fill the frame when you crop.' },
    ],
  },
  {
    slug: 'graphic-designers',
    plural: 'graphic designers and illustrators',
    kind: 'designer',
    title: 'Portfolio Website for Graphic Designers | LivePortfolio',
    description: 'Put your best visual work on one fast, clean page. A portfolio for graphic designers and illustrators with projects, clients and contact. Preview free.',
    h1: 'A portfolio website for graphic designers and illustrators',
    intro: 'Clients decide in seconds whether your style fits their brand. A focused page of your strongest work, with a line on each project, makes that decision easy and gets you the right enquiries.',
    show: [
      'Your five to eight strongest projects, not everything you have made.',
      'For each: the brief, who it was for and what you produced.',
      'The kinds of work you want more of, so clients can tell if you are a fit.',
      'Mockups of your work in use: packaging, social posts, signage.',
      'A phone number or WhatsApp and an email, so a client can reach you fast.',
    ],
    ideas: [
      'Create a full brand identity for an imagined or friendly local business.',
      'Redesign the poster, menu or social posts of a place you know.',
      'Make a short series in one consistent style to show range inside a theme.',
    ],
    headlines: [
      'Brand designer helping small businesses look as good as they work.',
      'Illustrator creating warm, bold characters for children\'s books and brands.',
      'Graphic designer for events, music and community organisations.',
    ],
    mistakes: [
      'Showing everything, so the best work is hidden.',
      'Posting work with no context about the brief or the client.',
      'Making it hard to contact you.',
    ],
    faq: [
      { q: 'How many pieces should a graphic design portfolio have?', a: 'Five to eight of your strongest. Every extra weaker piece lowers how the whole page feels.' },
      { q: 'Can clients contact me from my page?', a: 'Yes. Your email, phone and WhatsApp appear as icons, and each one opens straight away on a phone.' },
      { q: 'Can I show client work?', a: 'If you have permission, yes. Otherwise show self-initiated work, which also shows the style you want to be hired for.' },
    ],
  },
  {
    slug: 'accountants',
    plural: 'accountants',
    kind: 'finance',
    title: 'Portfolio Website for Accountants | LivePortfolio',
    description: 'A professional page for accountants: your experience, certifications and the results you delivered, ready to share with employers and clients.',
    h1: 'A portfolio website for accountants',
    intro: 'Accounting is a trust profession, and a CV rarely shows how you work. A clear, professional page with your experience, qualifications and the results you delivered gives employers and clients something solid to check before they call.',
    show: [
      'Your qualifications and professional memberships, with the year, up front.',
      'The kinds of businesses and work you have handled: audit, tax, payroll, reporting.',
      'Results that can be checked: months closed faster, errors found, audits completed.',
      'The tools you use well, in context, such as Excel, QuickBooks, SAP or Sage.',
      'How to reach you, and your location, since clients often want someone nearby.',
    ],
    ideas: [
      'A write-up of a reconciliation or reporting process you improved.',
      'A summary of a final-year or professional-exam project, without private data.',
      'A short guide for small businesses on a tax or record-keeping question you know well.',
    ],
    headlines: [
      'Chartered accountant helping growing businesses keep clean books and meet deadlines.',
      'Audit associate with two years in retail and manufacturing.',
      'Freelance bookkeeper for small businesses and startups.',
    ],
    mistakes: [
      'A page of duties with no result in numbers.',
      'Leaving out your qualifications, which are your main proof.',
      'Sharing confidential client figures.',
    ],
    faq: [
      { q: 'Does an accountant need a portfolio?', a: 'It helps, especially if you freelance or want to stand out. A page shows qualifications and results in one place and is easier to share than a CV.' },
      { q: 'Is it suitable for finance and tax professionals too?', a: 'Yes. The layout works for any role where credentials, experience and results matter.' },
      { q: 'Can I include my certifications?', a: 'Yes. Add them to your portfolio so they show next to your experience.' },
    ],
  },
  {
    slug: 'financial-analysts',
    plural: 'financial analysts',
    kind: 'finance',
    title: 'Portfolio Website for Financial Analysts | LivePortfolio',
    description: 'Show your models, analysis and results. A portfolio for financial analysts and bankers, built from your CV, with a free preview.',
    h1: 'A portfolio website for financial analysts',
    intro: 'Analysts are hired on judgement and rigour, and both are hard to show on a CV. A portfolio can present a model, a memo or a market view, with the question, the method and the conclusion, in a way a reader can follow in a minute.',
    show: [
      'Two or three pieces of analysis: the question, your method and your conclusion.',
      'Model screenshots or a short summary of the assumptions, where you may share them.',
      'Your credentials, such as CFA progress or ACCA, and the markets or sectors you cover.',
      'Results from roles: forecasts that held up, costs saved, deals supported.',
      'A short view on a market or company, to show how you think.',
    ],
    ideas: [
      'A valuation of a listed company, with your assumptions and a clear recommendation.',
      'A budget or forecast model for a small business you know.',
      'A short note on how a recent rate or currency move affects a sector.',
    ],
    headlines: [
      'Financial analyst building models that help teams decide where to invest.',
      'Equity research associate covering Nigerian banks and consumer goods.',
      'FP&A analyst who makes forecasts finance and operations both trust.',
    ],
    mistakes: [
      'A wall of acronyms and no conclusion.',
      'Presenting a model without its assumptions.',
      'Mixing in confidential figures from an employer.',
    ],
    faq: [
      { q: 'What should a financial analyst portfolio show?', a: 'A few examples of analysis with the question, method and conclusion, plus your credentials and results from past roles.' },
      { q: 'Can I show models without exposing company data?', a: 'Yes. Use public companies or a made-up business, state your assumptions and keep the focus on your method.' },
      { q: 'Will the page work well on a phone?', a: 'Yes. Pages are built to read well on small screens, which is where many people will open your link.' },
    ],
  },
  {
    slug: 'nurses',
    plural: 'nurses',
    kind: 'clinician',
    title: 'Portfolio Website for Nurses | LivePortfolio',
    description: 'A professional page for nurses: your experience, specialties, registrations and training in one place, ready to share with employers.',
    h1: 'A portfolio website for nurses',
    intro: 'Whether you are applying at home or abroad, employers want to see your registration, your experience and your specialties clearly. A single professional page puts all of it in one link, ready to send with an application.',
    show: [
      'Your registration and licences, with the body and the year, at the top.',
      'Your specialties and the settings you have worked in: ward, emergency, community, theatre.',
      'Training and short courses, such as life support and infection control, with dates.',
      'Responsibilities in concrete terms: the size of the unit, the patients you cared for, what you led.',
      'Languages you speak and your location, which matter for many roles.',
    ],
    ideas: [
      'A short summary of a quality improvement you took part in, without patient details.',
      'Your final-year placement experience, with what you learned.',
      'Continuing education you completed, listed with dates.',
    ],
    headlines: [
      'Registered nurse with three years in emergency care and a commitment to patient safety.',
      'Theatre nurse experienced in orthopaedic and general surgery.',
      'Community health nurse focused on maternal and child health.',
    ],
    mistakes: [
      'Sharing any information that could identify a patient.',
      'Leaving out your registration number or status.',
      'Describing duties without the setting or scale.',
    ],
    faq: [
      { q: 'Should a nurse have an online portfolio?', a: 'It is increasingly useful, particularly for applications abroad, where employers review candidates online. It collects your credentials and experience in one link.' },
      { q: 'Is it only for tech jobs?', a: 'No. The pages work for any profession, and your experience and certifications are presented as clearly as projects are for a developer.' },
      { q: 'Is it safe to put my details online?', a: 'You choose what to show. Leave out anything you do not want public, and never include patient information.' },
    ],
  },
  {
    slug: 'doctors',
    plural: 'doctors and pharmacists',
    kind: 'clinician',
    title: 'Portfolio Website for Doctors & Pharmacists | LivePortfolio',
    description: 'A clear professional page for doctors and pharmacists: qualifications, experience, research and registrations in one shareable link.',
    h1: 'A portfolio website for doctors and pharmacists',
    intro: 'Your qualifications, posts and research are spread across forms and documents. One clear page that brings them together is easier for a hospital, a recruiter or a colleague to review, and quicker to keep current.',
    show: [
      'Your qualifications and registration, with the body and the year.',
      'Posts and rotations: the specialty, the setting and the dates.',
      'Research, audits and presentations, with a link where one exists.',
      'Procedures and areas of clinical interest, in your own words.',
      'Teaching, mentoring or leadership roles.',
    ],
    ideas: [
      'A summary of an audit or quality project, with the finding and what changed.',
      'A list of conferences or talks you presented at, with dates.',
      'A short statement of the work you want to do next.',
    ],
    headlines: [
      'Medical doctor with a focus on internal medicine and patient education.',
      'Pharmacist specialising in hospital and clinical pharmacy.',
      'Junior doctor with research experience in infectious diseases.',
    ],
    mistakes: [
      'Including any patient-identifiable information.',
      'Leaving out dates, so the timeline is unclear.',
      'Writing a CV in paragraphs rather than showing a clear structure.',
    ],
    faq: [
      { q: 'Why would a doctor need a portfolio website?', a: 'It gives recruiters and colleagues one link to your qualifications, posts and research, and it is easier to keep up to date than a stack of documents.' },
      { q: 'Can I include my publications?', a: 'Yes. List them with links to the journal or repository, so a reader can follow up.' },
      { q: 'Can I start from my CV?', a: 'Yes. Upload your CV and your details are filled in for you to review and correct.' },
    ],
  },
  {
    slug: 'cybersecurity-analysts',
    plural: 'cybersecurity professionals',
    kind: 'engineer',
    title: 'Portfolio Website for Cybersecurity Professionals | LivePortfolio',
    description: 'Show your labs, certifications and findings. A portfolio for cybersecurity analysts and engineers that proves practical skill. Preview free.',
    h1: 'A portfolio website for cybersecurity professionals',
    intro: 'Security hiring leans on proof of practical skill. Certifications open the door, but write-ups of labs, investigations and fixes show how you work. A portfolio puts that proof in one place.',
    show: [
      'Your certifications, with dates, at the top.',
      'Write-ups of labs, capture-the-flag challenges or incidents: what you found and how.',
      'Tools you use and the situations you used them in.',
      'Fixes and hardening work: the weakness, the change and the result.',
      'Writing or talks, if you have any, which show you can explain risk clearly.',
    ],
    ideas: [
      'A write-up of a lab or CTF challenge you solved, step by step.',
      'A home lab you built, with what you learned about its weaknesses.',
      'A plain-language guide to a common threat for small businesses.',
    ],
    headlines: [
      'Security analyst monitoring and investigating threats for a financial services team.',
      'Penetration tester focused on web applications and APIs.',
      'Cloud security engineer helping teams build safer systems.',
    ],
    mistakes: [
      'Publishing details that could expose a real company or user.',
      'A list of tools with no example of using them.',
      'Skipping the explanation: the reader needs to see your reasoning.',
    ],
    faq: [
      { q: 'What should a cybersecurity portfolio include?', a: 'Certifications plus practical evidence: write-ups of labs and investigations, and fixes you made, with your reasoning clearly explained.' },
      { q: 'Can I publish write-ups of real incidents?', a: 'Only if you have permission and remove anything that identifies a company or person. Lab and challenge write-ups are safer and just as convincing.' },
      { q: 'Is there a template for technical roles?', a: 'Yes. There are designs aimed at security and engineering roles among the Pro templates, and you can preview each with your own details for free.' },
    ],
  },
  {
    slug: 'fresh-graduates',
    plural: 'fresh graduates and students',
    kind: 'engineer',
    title: 'Portfolio Website for Graduates & Students | LivePortfolio',
    description: 'No work experience yet? A graduate portfolio that shows your projects, skills and potential. Start from your CV, preview free, publish when ready.',
    h1: 'A portfolio website for fresh graduates and students',
    intro: 'Not having a job history does not mean having nothing to show. Course projects, final-year work, volunteering, internships and things you built yourself are all evidence. A portfolio organises them so an employer can see what you can do.',
    show: [
      'Your final-year project, with the problem, your approach and what you found.',
      'Two or three other projects: coursework, team projects or things you built for fun.',
      'Internships, volunteering and society roles, with what you actually did.',
      'Skills shown in use, tied to the project where you used them.',
      'Your degree, class and school, and what you want to do next.',
    ],
    ideas: [
      'Turn your best assignment into a project page: the brief, your method and the result.',
      'Build something small that solves a problem for people you know.',
      'Run an event or a project in a student society and write up what happened.',
    ],
    headlines: [
      'Computer science graduate who builds practical tools and learns fast.',
      'Final-year accounting student with internship experience in audit.',
      'Recent graduate in mechanical engineering looking for a design role.',
    ],
    mistakes: [
      'Writing "no experience" instead of showing what you have done.',
      'Listing skills with no project that uses them.',
      'Leaving out the final-year project, often your strongest piece.',
    ],
    faq: [
      { q: 'I have no work experience. Can I still build a portfolio?', a: 'Yes. Projects, coursework, volunteering and things you made are real evidence, and they are what employers look at for entry-level roles.' },
      { q: 'What if my projects are from school?', a: 'That is fine. State that they are course projects and focus on what you decided and learned. A small self-started project shows initiative on top.' },
      { q: 'Can I try it before paying anything?', a: 'Yes. You can build and preview your portfolio free. You only pay when you decide to publish it at your own address.' },
    ],
  },
  {
    slug: 'marketers',
    plural: 'marketers and content creators',
    kind: 'designer',
    title: 'Portfolio Website for Marketers & Content Creators | LivePortfolio',
    description: 'Show campaigns, content and results in one page. A portfolio for marketers, writers and social media professionals. Build and preview free.',
    h1: 'A portfolio website for marketers and content creators',
    intro: 'Marketing is judged on results, and results are easy to claim and hard to believe. A portfolio that pairs real work with the goal and the outcome makes your claims credible, and gives clients something to forward to a boss.',
    show: [
      'Campaigns or content, each with the goal, what you did and the result.',
      'Numbers you can verify: reach, sign-ups, sales, growth in followers or traffic.',
      'Samples of your writing, design or video, with links to the live posts.',
      'The channels you are strongest in, and the kinds of brands you have worked with.',
      'Testimonials or a client name, with permission.',
    ],
    ideas: [
      'Grow a small account or newsletter for a month and write up what worked.',
      'Run a campaign for a friend\'s business and report the results honestly.',
      'Rewrite the landing page of a brand you like, with your reasoning.',
    ],
    headlines: [
      'Digital marketer who grows small brands with content people want to read.',
      'Copywriter for fintech and e-commerce, focused on clear, honest messaging.',
      'Social media manager building communities for lifestyle and food brands.',
    ],
    mistakes: [
      'Saying "grew engagement" with no figure or timeframe.',
      'Showing only screenshots, with no goal or result.',
      'Claiming credit for the whole result when a team delivered it.',
    ],
    faq: [
      { q: 'What should a marketing portfolio include?', a: 'Campaigns or pieces of content, each with the goal, your role and a result you can back up, plus a way to reach you.' },
      { q: 'I work for brands that I cannot name. What can I show?', a: 'Describe the sector and the work, share results with permission, or add self-started projects where you can show everything.' },
      { q: 'Can I link to live content?', a: 'Yes. Add links to posts, articles and campaigns, so readers can see the real thing.' },
    ],
  },
]

export const ROLE_SLUGS: readonly string[] = ROLE_PAGES.map((r) => r.slug)

export function roleBySlug(slug: string): RolePage | undefined {
  return ROLE_PAGES.find((r) => r.slug === slug)
}
