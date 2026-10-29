/**
 * Studio work, in the order the studio wants it read: client products first, then our own tools.
 * Every claim comes from the project's own README or live site (checked 2026-10-24); nothing is
 * invented. Images are captures of the products themselves, in /public/work.
 */
import type { EmblemKind } from './emblems';

export interface ProjectImage {
  desktop: string;
  mobile: string;
  /** Intrinsic sizes, so the browser reserves space before the image arrives (no layout shift). */
  desktopSize: [number, number];
  mobileSize: [number, number];
  alt: string;
  /** Wide strips keep their own proportions on phones instead of the 4:5 first-screen crop. */
  wide?: boolean;
}

export interface Project {
  slug: string;
  name: string;
  /** One sentence: what it is, for whom. */
  line: string;
  discipline: string;
  role: string;
  stack: string;
  year: string;
  /** Brand colour of the project itself; used as a field behind its media. */
  tone: string;
  /** Ink that reads on `tone`. */
  toneInk: string;
  emblem: EmblemKind;
  image?: ProjectImage;
  links: { label: string; href: string }[];
  /** Case study, in three short movements. */
  brief: string;
  built: string[];
  decisions: string[];
  /** A verifiable figure from the project, shown large. */
  figure?: { value: string; label: string };
}

export const projects: Project[] = [
  {
    slug: 'amr',
    name: 'AMR Screening',
    line: 'AI-assisted screening of approved medicines against four drug-resistant bacteria.',
    discipline: 'Research interface',
    role: 'Collaborative research software with Yash Prajapati',
    stack: 'Python · RDKit · AutoDock Vina · web dashboard',
    year: '2026',
    tone: '#e7efec',
    toneInk: '#10302a',
    emblem: 'molecule',
    image: {
      desktop: '/work/amr-d.jpg',
      mobile: '/work/amr-m.jpg',
      desktopSize: [1440, 900],
      mobileSize: [780, 975],
      alt: 'The AMR screening overview: the headline “Old medicines, new questions.” beside dataset counts of 20K structures and 1,761 approved medicines.',
    },
    links: [
      { label: 'Live prototype', href: 'https://amr-drug-repurposing.vercel.app' },
      { label: 'Source', href: 'https://github.com/VED2107/amr-drug-repurposing' },
    ],
    brief:
      'Repurposing an approved drug is a shorter road to the clinic than discovering a new one. This prototype screens the FDA-approved library against MRSA, E. coli, K. pneumoniae and M. tuberculosis.',
    built: [
      'A pipeline from ChEMBL bioactivity and FDA approvals to 1024-bit Morgan fingerprints and a benchmarked model zoo per pathogen.',
      'Docking of prioritised candidates with AutoDock Vina against one validated protein target per pathogen.',
      'A dashboard where every prediction can be inspected down to its evidence.',
    ],
    decisions: [
      'A stated scientific boundary on every screen: these are computational hypotheses, not evidence of efficacy.',
      'Numbers are counted once and explained, including the structures that were dropped and why.',
    ],
    figure: { value: '1,761', label: 'approved medicines screened' },
  },
  {
    slug: 'nova',
    name: 'NOVA',
    line: 'A privacy-first desktop media player: no account, no telemetry, works offline.',
    discipline: 'Desktop product',
    role: 'Our own product',
    stack: 'Tauri 2 · React 19 · Rust · libmpv',
    year: '2026',
    tone: '#141312',
    toneInk: '#f4f1ea',
    emblem: 'play',
    image: {
      desktop: '/work/nova-d.jpg',
      mobile: '/work/nova-m.jpg',
      desktopSize: [1440, 900],
      mobileSize: [780, 975],
      alt: 'The NOVA site: a giant NOVA wordmark in black and orange above the player showing a film frame.',
    },
    links: [
      { label: 'nova.snowbros.me', href: 'https://nova.snowbros.me' },
      { label: 'Source', href: 'https://github.com/VED2107/nova' },
    ],
    brief:
      'A media player that tells you the truth: what it decoded, with which decoder, and where you stopped — across restarts and crashes, even when files move.',
    built: [
      'Native video through libmpv with hardware decoding and software fallback, under a transparent React interface.',
      'Frame-accurate seeking, A–B loops, a library with background scanning and full-text search.',
      'Engine-confirmed state only: the interface shows what libmpv reports, never what it hopes happened.',
    ],
    decisions: [
      'Pure domain rules in their own Rust crates, so the queue and resume policy are tested without an engine.',
      'Professional formats verified on synthetic samples — ProRes, DNxHR, HDR10, 8K — before anyone trusts it.',
    ],
    figure: { value: '1 frame', label: 'seek precision on the timeline' },
  },
  {
    slug: 'accounic',
    name: 'Accounic',
    line: 'A multi-currency ledger: web, Android and Windows clients on one Postgres schema.',
    discipline: 'Cross-platform product',
    role: 'Our own product',
    stack: 'Next.js · Flutter · Supabase / Postgres',
    year: '2026',
    tone: '#1b1a17',
    toneInk: '#f2f0eb',
    emblem: 'ledger',
    image: {
      desktop: '/work/accounic-d.jpg',
      mobile: '/work/accounic-m.jpg',
      desktopSize: [1344, 432],
      mobileSize: [1046, 378],
      alt: 'The Accounic dashboard: a net position of ₹500 receivable and ₹0 payable, drawn over a field of fine woven lines.',
      wide: true,
    },
    links: [
      { label: 'Latest release', href: 'https://github.com/VED2107/accounic/releases/latest' },
      { label: 'Source', href: 'https://github.com/VED2107/accounic' },
    ],
    brief:
      'It answers four questions and little else: who do I have an account with, how much do they owe me, how much do I owe them, and what has been settled.',
    built: [
      'One backend where the database owns every balance: no client ever adds up a column.',
      'A FIFO settlement allocator, and entries kept in the currency they were entered in.',
      'A Windows installer and an Android APK that check GitHub Releases and offer the new build.',
    ],
    decisions: [
      'Forced row-level security on every table, verified by 71 tenant-isolation checks over real HTTP.',
      'Releases are built by CI and left as drafts: a person decides when a build reaches installed clients.',
    ],
    figure: { value: '234', label: 'SQL assertions in CI' },
  },
  {
    slug: 'swiftdrop',
    name: 'SwiftDrop',
    line: 'Photos and files straight between phone and PC over your own Wi-Fi.',
    discipline: 'Cross-platform app',
    role: 'Our own product',
    stack: 'Flutter · Node · WebRTC',
    year: '2026',
    tone: '#191617',
    toneInk: '#f6efec',
    emblem: 'transfer',
    image: {
      desktop: '/work/swiftdrop-d.jpg',
      mobile: '/work/swiftdrop-m.jpg',
      desktopSize: [1440, 900],
      mobileSize: [780, 975],
      alt: 'The SwiftDrop site: the headline “Send anything. Directly.” beside a transfer panel reading 33.6 MB/s.',
    },
    links: [
      { label: 'swiftdrop.snowbros.me', href: 'https://swiftdrop.snowbros.me' },
      { label: 'Source', href: 'https://github.com/VED2107/swiftdrop' },
    ],
    brief:
      'No cloud, no cable, no account and nothing to install on an iPhone: the phone scans a code, the PC allows it, and files travel in parallel chunks over the local network.',
    built: [
      'Native Windows and Android apps in Flutter, plus a browser path for iPhone.',
      'Phone-to-phone transfer over WebRTC, where the code carries connection details and never data.',
      'PC-to-phone downloads served straight from disk, with nothing copied.',
    ],
    decisions: [
      'Works without internet: only two devices and a router or hotspot.',
      'Firewall trouble is the commonest failure, so the fix ships with the app.',
    ],
  },
  {
    slug: 'stc',
    name: 'STC Academy',
    line: 'A teaching platform for CBSE and GSEB students, with an admin command centre behind it.',
    discipline: 'Education platform',
    role: 'Client project',
    stack: 'Next.js · TypeScript · Supabase',
    year: '2026',
    tone: '#f1ece2',
    toneInk: '#1c1a16',
    emblem: 'book',
    image: {
      desktop: '/work/stc-d.jpg',
      mobile: '/work/stc-m.jpg',
      desktopSize: [1440, 900],
      mobileSize: [780, 643],
      alt: 'STC Academy on laptop, tablet and phone: the admin command centre with student, attendance and fee panels, and the public site headline “Cultivating the Intellect of Tomorrow.”',
      wide: true,
    },
    links: [{ label: 'Source', href: 'https://github.com/VED2107/STC' }],
    brief:
      'Students from primary school to HSC, on two boards, with tracks for JEE and NEET — and a small team that has to run admissions, attendance, fees and materials without spreadsheets.',
    built: [
      'A dual-pathway course system: board-aligned curriculum alongside competitive-exam preparation.',
      'Faculty mentorship profiles and small-batch enrolment, filterable by level, subject and pathway.',
      'An admin command centre for students, teachers, subjects, attendance, QR codes and fee status.',
    ],
    decisions: [
      'Supabase for auth, storage and real-time data, so the school runs on one managed backend.',
      'The same records serve the public site and the admin tools: nothing is entered twice.',
    ],
  },
  {
    slug: 'atlas',
    name: 'Atlas',
    line: 'Static analysis for JavaScript and TypeScript that reports only what it can prove.',
    discipline: 'Developer tool',
    role: 'Our open-source tool',
    stack: 'Rust · tree-sitter · LSP · VS Code',
    year: '2026',
    tone: '#1f2b24',
    toneInk: '#f2f0eb',
    emblem: 'graph',
    image: {
      desktop: '/work/atlas-d.jpg',
      mobile: '/work/atlas-m.jpg',
      desktopSize: [1440, 900],
      mobileSize: [780, 975],
      alt: 'An Atlas HTML report: health scores of 93 overall and 66 for architecture, above findings for a server-only module reachable from a client component and a circular import chain.',
    },
    links: [
      { label: 'Source and docs', href: 'https://github.com/snowbros-labs/atlas' },
      { label: 'npm @snowbros/atlas', href: 'https://www.npmjs.com/package/@snowbros/atlas' },
    ],
    brief:
      'Linters guess. Atlas maps a whole project — every import, export, env var and framework boundary — and reports circular imports, dead files, server code leaking into client components and hardcoded secrets, each with the chain of evidence that produced it.',
    built: [
      'A native Rust engine with a shared semantic IR and a tree-sitter frontend per language.',
      'A command line (`npx snowbros analyze`), a built-in language server and a VS Code extension.',
      'Deterministic output: the same codebase in gives the same findings out, every run.',
    ],
    decisions: [
      'No model decides whether an issue exists. Every finding is provable or it is not reported.',
      'Speed is a feature: on axios (431 files) a cold run takes about 230 ms, a warm one about 76 ms.',
    ],
    figure: { value: '230 ms', label: 'cold run on axios, 431 files' },
  },
];

/** Shipped work shown as a list. `href` only where a working page exists. */
export const alsoShipped: { name: string; what: string; stack: string; href?: string }[] = [
  {
    name: 'Creative Engineering',
    what: 'Our open-source agent skill and eight @snowbros libraries — see them run in the lab',
    stack: 'TypeScript · three.js',
    href: './lab.html',
  },
  {
    name: 'Lunora Studio',
    what: 'Handmade-bouquet store with a scroll-told landing page',
    stack: 'Next.js · Supabase · GSAP',
  },
  {
    name: 'Mentor',
    what: 'An engineering-mentor skill for Claude Code',
    stack: 'Agent skill',
    href: 'https://github.com/snowbros-labs/mentor-skill',
  },
];
