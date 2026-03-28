<script lang="ts">
import { tick } from 'svelte';
import { Accordion } from 'bits-ui';
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';

type ProjectRow = {
  id: string;
  name: string;
  /** URL-safe id for plus-address email: jwyprzal+{slug}-{account}@gmail.com */
  slug: string;
  accountNames: string[];
  createdLabel: string;
  templateLabel: string;
  detailBlurb: string;
  /** App / marketing site */
  websiteUrl: string;
  githubUrl: string;
  /** AWS console / IAM Identity Center sign-in */
  awsSignInUrl: string;
  /** Placeholder account ids for layout only */
  accountHints?: string[];
  /** Per-account AWS spend (USD strings); same length as accountNames; not edited in UI */
  accountCostsLastMonth?: string[];
  accountCostsCurrent?: string[];
  accountCostsPredicted?: string[];
  /** Newly added row: show Save/Cancel until saved */
  isDraft?: boolean;
};

/** Plain USD amounts (grouping); `$` lives in column headers only */
const costAmountFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

function parseAccountCostInput(s: string): number {
  const t = String(s ?? '')
    .replace(/[$,]/g, '')
    .trim();
  if (t === '') return 0;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

type CostKind = 'lastMonth' | 'current' | 'predicted';

function projectCostSumByKind(p: ProjectRow, kind: CostKind): number {
  const arr =
    kind === 'lastMonth'
      ? (p.accountCostsLastMonth ?? [])
      : kind === 'current'
        ? (p.accountCostsCurrent ?? [])
        : (p.accountCostsPredicted ?? []);
  let sum = 0;
  for (let i = 0; i < p.accountNames.length; i++) {
    sum += parseAccountCostInput(arr[i] ?? '');
  }
  return sum;
}

/** Sort / headline total: predicted month spend */
function projectAccountsCostTotal(p: ProjectRow): number {
  return projectCostSumByKind(p, 'predicted');
}

function formatCostAmount(n: number): string {
  return costAmountFormatter.format(n);
}

function awsCostCell(raw: string | undefined): { show: boolean; amount: string } {
  const n = parseAccountCostInput(raw ?? '');
  const show = n !== 0 || String(raw ?? '').trim() !== '';
  return { show, amount: formatCostAmount(n) };
}

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Plus-address: jwyprzal+{slug}-{account}@gmail.com (slug normalized like new-project) */
const ACCOUNT_EMAIL_LOCAL = 'jwyprzal';
const ACCOUNT_EMAIL_DOMAIN = 'gmail.com';

function accountAliasEmail(accountName: string, projectSlug: string) {
  const slugPart = slugify(projectSlug) || 'project';
  const accountPart = slugify(accountName) || 'account';
  const tag = `${slugPart}-${accountPart}`;
  return `${ACCOUNT_EMAIL_LOCAL}+${tag}@${ACCOUNT_EMAIL_DOMAIN}`;
}

/** Short month, zero-padded day, and year for the Created column */
function shortDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

let projects = $state<ProjectRow[]>([
  {
    id: 'seed-acme',
    name: 'Acme platform',
    slug: 'acme-platform',
    accountNames: ['acme-int', 'acme-stage', 'acme-prod'],
    createdLabel: 'Mar 20, 2026',
    templateLabel: 'SST monorepo starter',
    detailBlurb:
      'Main product stack: SvelteKit, AppSync, DynamoDB, Cognito. Three linked AWS accounts for integration, staging, and production.',
    accountHints: ['111111111111', '222222222222', '333333333333'],
    accountCostsLastMonth: ['290', '520', '2150'],
    accountCostsCurrent: ['118', '205', '820'],
    accountCostsPredicted: ['320', '580', '2400'],
    websiteUrl: 'https://acme-platform.example.com',
    githubUrl: 'https://github.com/acme-corp/acme-platform',
    awsSignInUrl: 'https://signin.aws.amazon.com/console',
  },
  {
    id: 'seed-billing',
    name: 'Billing API',
    slug: 'billing-api',
    accountNames: ['billing-dev', 'billing-stage', 'billing-prod'],
    createdLabel: 'Mar 15, 2026',
    templateLabel: 'SST monorepo starter',
    detailBlurb: '',
    accountHints: ['444444444444', '555555555555', '666666666666'],
    accountCostsLastMonth: ['195', '310', '820'],
    accountCostsCurrent: ['72', '118', '305'],
    accountCostsPredicted: ['210', '340', '890'],
    websiteUrl: 'https://billing-api.example.com',
    githubUrl: 'https://github.com/acme-corp/billing-api',
    awsSignInUrl: 'https://signin.aws.amazon.com/console',
  },
]);

const DEFAULT_GITHUB_URL = 'https://github.com/';
const DEFAULT_AWS_SIGNIN_URL = 'https://signin.aws.amazon.com/console';

const actionLinkClass =
  'inline-flex size-8 shrink-0 items-center justify-center border border-border text-foreground text-xs font-semibold transition-colors hover:bg-muted/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** Which accordion panels are open (bits-ui `type="multiple"`). */
let accordionValue = $state<string[]>([]);

const MIN_ACCOUNTS = 1;
const MAX_ACCOUNTS = 10;

function clampCount(n: number) {
  return Math.min(MAX_ACCOUNTS, Math.max(MIN_ACCOUNTS, Math.floor(n) || MIN_ACCOUNTS));
}

function addProject() {
  const id = crypto.randomUUID();
  projects = [
    {
      id,
      name: 'New project',
      slug: '',
      accountNames: ['int', 'stage', 'prod'],
      createdLabel: shortDate(new Date()),
      templateLabel: '',
      detailBlurb: '',
      accountHints: ['', '', ''],
      accountCostsLastMonth: ['', '', ''],
      accountCostsCurrent: ['', '', ''],
      accountCostsPredicted: ['', '', ''],
      websiteUrl: '',
      githubUrl: DEFAULT_GITHUB_URL,
      awsSignInUrl: DEFAULT_AWS_SIGNIN_URL,
      isDraft: true,
    },
    ...projects,
  ];
  accordionValue = [id];
}

function setAccountCount(projectId: string, count: number) {
  const target = clampCount(count);
  projects = projects.map((p) => {
    if (p.id !== projectId) return p;
    let names = p.accountNames.slice(0, target);
    while (names.length < target) names.push('');
    let hints = (p.accountHints ?? []).slice(0, target);
    while (hints.length < target) hints.push('');
    let lastM = (p.accountCostsLastMonth ?? []).slice(0, target);
    while (lastM.length < target) lastM.push('');
    let curC = (p.accountCostsCurrent ?? []).slice(0, target);
    while (curC.length < target) curC.push('');
    let pred = (p.accountCostsPredicted ?? []).slice(0, target);
    while (pred.length < target) pred.push('');
    return {
      ...p,
      accountNames: names,
      accountHints: hints,
      accountCostsLastMonth: lastM,
      accountCostsCurrent: curC,
      accountCostsPredicted: pred,
    };
  });
}

function onProjectAccountCountInput(projectId: string, e: Event & { currentTarget: HTMLInputElement }) {
  const v = Number.parseInt(e.currentTarget.value, 10);
  setAccountCount(projectId, Number.isFinite(v) ? v : MIN_ACCOUNTS);
}

function patchProject(id: string, patch: Partial<ProjectRow>) {
  projects = projects.map((p) => (p.id === id ? { ...p, ...patch } : p));
}

function saveDraftProject(id: string) {
  patchProject(id, { isDraft: false });
}

function discardDraftProject(id: string) {
  projects = projects.filter((p) => p.id !== id);
  accordionValue = accordionValue.filter((v) => v !== id);
}

let editingProjectId = $state<string | null>(null);
let editSnapshot = $state<ProjectRow | null>(null);

function cloneProjectRow(row: ProjectRow): ProjectRow {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    accountNames: [...row.accountNames],
    createdLabel: row.createdLabel,
    templateLabel: row.templateLabel,
    detailBlurb: row.detailBlurb,
    websiteUrl: row.websiteUrl,
    githubUrl: row.githubUrl,
    awsSignInUrl: row.awsSignInUrl,
    accountHints: row.accountHints ? [...row.accountHints] : undefined,
    accountCostsLastMonth: row.accountCostsLastMonth ? [...row.accountCostsLastMonth] : undefined,
    accountCostsCurrent: row.accountCostsCurrent ? [...row.accountCostsCurrent] : undefined,
    accountCostsPredicted: row.accountCostsPredicted ? [...row.accountCostsPredicted] : undefined,
    isDraft: row.isDraft,
  };
}

function startEditingProject(id: string) {
  const row = projects.find((p) => p.id === id);
  if (!row || row.isDraft) return;
  if (editingProjectId !== null && editingProjectId !== id) {
    cancelEditingProject();
  }
  editSnapshot = cloneProjectRow(row);
  editingProjectId = id;
}

function saveEditingProject() {
  editingProjectId = null;
  editSnapshot = null;
}

function cancelEditingProject() {
  if (editingProjectId !== null && editSnapshot !== null) {
    const id = editingProjectId;
    const snap = editSnapshot;
    projects = projects.map((p) => (p.id === id ? snap : p));
  }
  editingProjectId = null;
  editSnapshot = null;
}

type SortKey = 'name' | 'cost' | 'template' | 'created' | 'accounts';

let sortKey = $state<SortKey | null>(null);
let sortDir = $state<'asc' | 'desc'>('asc');

let showScrollDownChevron = $state(false);

function updateScrollDownChevron() {
  if (typeof document === 'undefined') return;
  const doc = document.documentElement;
  const roomBelow = doc.scrollHeight - window.innerHeight - window.scrollY;
  showScrollDownChevron = roomBelow > 72;
}

function scrollPageDownStep() {
  const doc = document.documentElement;
  const vh = window.innerHeight;
  const maxTop = doc.scrollHeight - vh;
  const next = Math.min(doc.scrollTop + vh * 0.85, maxTop);
  window.scrollTo({ top: next, behavior: 'smooth' });
}

$effect(() => {
  if (typeof window === 'undefined') return;
  updateScrollDownChevron();
  window.addEventListener('scroll', updateScrollDownChevron, { passive: true });
  window.addEventListener('resize', updateScrollDownChevron);
  return () => {
    window.removeEventListener('scroll', updateScrollDownChevron);
    window.removeEventListener('resize', updateScrollDownChevron);
  };
});

$effect(() => {
  accordionValue;
  if (typeof window === 'undefined') return;
  void tick().then(() => updateScrollDownChevron());
});

function toggleSort(key: SortKey) {
  if (sortKey === key) {
    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey = key;
    sortDir = 'asc';
  }
}

function createdLabelToTime(label: string): number {
  const direct = Date.parse(label);
  if (Number.isFinite(direct)) return direct;
  const inferred = Date.parse(`${label} ${new Date().getFullYear()}`);
  return Number.isFinite(inferred) ? inferred : 0;
}

let displayedProjects = $derived.by(() => {
  if (sortKey === null) return projects;
  const list = projects.slice();
  const m = sortDir === 'asc' ? 1 : -1;
  list.sort((a, b) => {
    let c = 0;
    switch (sortKey) {
      case 'name':
        c = a.name.localeCompare(b.name);
        break;
      case 'cost':
        c = projectAccountsCostTotal(a) - projectAccountsCostTotal(b);
        break;
      case 'template':
        c = a.templateLabel.localeCompare(b.templateLabel);
        break;
      case 'created':
        c = createdLabelToTime(a.createdLabel) - createdLabelToTime(b.createdLabel);
        break;
      case 'accounts':
        c = a.accountNames.length - b.accountNames.length;
        break;
      default:
        break;
    }
    return c * m;
  });
  return list;
});

const sortHeadingBtnClass =
  'inline-flex max-w-full min-w-0 items-center gap-1 rounded-sm font-medium tracking-wide uppercase hover:bg-muted/25 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** Chevron, then name | accounts | cost | template | created (inside accordion trigger) */
const summaryTriggerGridClass =
  'grid min-h-14 min-w-0 flex-1 grid-cols-1 items-start gap-x-4 gap-y-1 py-3 pr-2 pl-4 text-left md:items-center md:grid-cols-[2rem_minmax(0,1fr)_3.5rem_minmax(9rem,12rem)_minmax(0,12rem)_10.5rem] md:gap-x-8';

/** Header row: same grid columns as trigger + space for actions */
const headerLeftGridClass =
  'grid min-w-0 flex-1 grid-cols-1 px-4 py-3 text-left text-muted-foreground text-xs md:grid md:grid-cols-[2rem_minmax(0,1fr)_3.5rem_minmax(9rem,12rem)_minmax(0,12rem)_10.5rem] md:gap-x-8';

/** Three fields in a row: 1 col, 2 from sm, 3 from lg (name block or URL block) */
const tripleFieldGridClass =
  'grid min-w-0 grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-3';

/** Stacked account row on small screens (AWS accounts table) */
const accountMobileCardClass =
  'flex flex-col gap-3 rounded-md border border-border bg-muted/10 px-3 py-3 shadow-sm';
const accountMobileFieldLabelClass =
  'text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground';
</script>

<svelte:head>
  <title>Projects — Admin project factory</title>
</svelte:head>

<main
  class="min-h-dvh min-w-0 max-w-full overflow-x-hidden px-6 pt-28 pb-16 md:px-10 md:pt-32 md:pb-20 lg:px-14 lg:pt-36"
>
  <div class="mx-auto w-full min-w-0 max-w-7xl">
    <div
      class="flex flex-col gap-6 border-border border-b pb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-4"
    >
      <div>
        <h1 class="font-display text-2xl font-semibold tracking-tight text-foreground lowercase md:text-3xl">
          projects
        </h1>
      </div>
      <Button
        type="button"
        variant="outline"
        class="shrink-0 rounded-sm border-foreground/40"
        onclick={addProject}
      >
        Add
      </Button>
    </div>

    <div class="mt-10 md:mt-12">
      {#if projects.length === 0}
        <p class="border-border border border-dashed px-4 py-8 text-center text-muted-foreground text-sm">
          No projects yet — use <span class="text-foreground">Add</span> to create one.
        </p>
      {:else}
        <div
          class="min-w-0 max-w-full overflow-x-hidden overflow-y-visible border border-border text-sm"
        >
          <div
            class="hidden w-full flex-col border-border border-b md:flex md:flex-row md:items-stretch"
          >
            <div class={headerLeftGridClass}>
              <span class="block md:min-w-[2rem]" aria-hidden="true"></span>
              <div class="hidden min-w-0 md:block">
                <button
                  type="button"
                  class={sortHeadingBtnClass}
                  aria-label="Sort by name"
                  onclick={() => toggleSort('name')}
                >
                  Name
                  <span
                    class="inline-flex shrink-0 flex-col text-[0.45rem] leading-[0.48rem]"
                    aria-hidden="true"
                  >
                    <span
                      class={sortKey === 'name' && sortDir === 'asc'
                        ? 'text-foreground'
                        : 'text-muted-foreground/40'}
                    >▲</span>
                    <span
                      class={sortKey === 'name' && sortDir === 'desc'
                        ? 'text-foreground'
                        : 'text-muted-foreground/40'}
                    >▼</span>
                  </span>
                </button>
              </div>
              <div class="hidden md:flex md:justify-end">
                <button
                  type="button"
                  class="{sortHeadingBtnClass} tabular-nums"
                  aria-label="Sort by account count"
                  onclick={() => toggleSort('accounts')}
                >
                  Accounts
                  <span
                    class="inline-flex shrink-0 flex-col text-[0.45rem] leading-[0.48rem]"
                    aria-hidden="true"
                  >
                    <span
                      class={sortKey === 'accounts' && sortDir === 'asc'
                        ? 'text-foreground'
                        : 'text-muted-foreground/40'}
                    >▲</span>
                    <span
                      class={sortKey === 'accounts' && sortDir === 'desc'
                        ? 'text-foreground'
                        : 'text-muted-foreground/40'}
                    >▼</span>
                  </span>
                </button>
              </div>
              <div class="hidden md:flex md:justify-end">
                <button
                  type="button"
                  class="{sortHeadingBtnClass} tabular-nums"
                  aria-label="Sort by predicted total cost"
                  onclick={() => toggleSort('cost')}
                >
                  Cost
                  <span
                    class="inline-flex shrink-0 flex-col text-[0.45rem] leading-[0.48rem]"
                    aria-hidden="true"
                  >
                    <span
                      class={sortKey === 'cost' && sortDir === 'asc'
                        ? 'text-foreground'
                        : 'text-muted-foreground/40'}
                    >▲</span>
                    <span
                      class={sortKey === 'cost' && sortDir === 'desc'
                        ? 'text-foreground'
                        : 'text-muted-foreground/40'}
                    >▼</span>
                  </span>
                </button>
              </div>
              <div class="hidden min-w-0 md:block">
                <button
                  type="button"
                  class="{sortHeadingBtnClass} max-w-full"
                  aria-label="Sort by template"
                  onclick={() => toggleSort('template')}
                >
                  <span class="min-w-0 truncate">Template</span>
                  <span
                    class="inline-flex shrink-0 flex-col text-[0.45rem] leading-[0.48rem]"
                    aria-hidden="true"
                  >
                    <span
                      class={sortKey === 'template' && sortDir === 'asc'
                        ? 'text-foreground'
                        : 'text-muted-foreground/40'}
                    >▲</span>
                    <span
                      class={sortKey === 'template' && sortDir === 'desc'
                        ? 'text-foreground'
                        : 'text-muted-foreground/40'}
                    >▼</span>
                  </span>
                </button>
              </div>
              <div class="hidden md:flex md:justify-end">
                <button
                  type="button"
                  class="{sortHeadingBtnClass} tabular-nums"
                  aria-label="Sort by created date"
                  onclick={() => toggleSort('created')}
                >
                  Created
                  <span
                    class="inline-flex shrink-0 flex-col text-[0.45rem] leading-[0.48rem]"
                    aria-hidden="true"
                  >
                    <span
                      class={sortKey === 'created' && sortDir === 'asc'
                        ? 'text-foreground'
                        : 'text-muted-foreground/40'}
                    >▲</span>
                    <span
                      class={sortKey === 'created' && sortDir === 'desc'
                        ? 'text-foreground'
                        : 'text-muted-foreground/40'}
                    >▼</span>
                  </span>
                </button>
              </div>
            </div>
            <div
              class="flex items-center justify-end gap-2 px-4 py-3 text-muted-foreground text-xs font-medium tracking-wide uppercase md:min-w-[11rem] md:px-3"
            >
              Actions
            </div>
          </div>

          <Accordion.Root type="multiple" class="min-w-0" bind:value={accordionValue}>
            {#each displayedProjects as p, rowIndex (p.id)}
              <Accordion.Item
                value={p.id}
                class="min-w-0 overflow-x-hidden overflow-y-visible border-x-0 border-b-0 border-border {rowIndex > 0 ? 'border-t' : ''}"
              >
                <Accordion.Header class="m-0 overflow-visible p-0">
                  <div
                    class="flex w-full min-w-0 max-w-full flex-row items-start overflow-x-hidden overflow-y-visible md:items-stretch"
                  >
                    <Accordion.Trigger
                      class="{summaryTriggerGridClass} min-w-0 flex-1 overflow-visible rounded-none border-0 bg-transparent text-left transition-colors hover:bg-muted/15 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&[data-state=open]_svg]:rotate-180"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="size-[18px] shrink-0 justify-self-start text-muted-foreground transition-transform duration-200 md:mx-auto md:justify-self-center"
                        aria-hidden="true"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                      <span class="min-w-0 w-full max-w-full">
                        <span class="block w-full font-medium text-foreground break-words">{p.name}</span>
                        <span
                          class="mt-0.5 block w-full font-mono text-[0.75rem] font-normal leading-snug text-muted-foreground break-all"
                        >
                          {slugify(p.slug) || '—'}
                        </span>
                      </span>
                      <span class="text-muted-foreground tabular-nums md:text-right">
                        <span class="md:hidden text-[0.65rem] uppercase tracking-wide text-muted-foreground/80"
                          >Accounts ·
                        </span>{p.accountNames.length}
                      </span>
                      <span class="min-w-0 md:text-right">
                        <span class="flex w-full min-w-0 max-w-full flex-col md:items-end">
                          <span
                            class="block w-full font-medium tabular-nums text-foreground break-words md:text-right"
                          >
                            {formatCostAmount(projectCostSumByKind(p, 'current'))}
                          </span>
                          <span
                            class="mt-0.5 flex w-full max-w-full items-baseline font-mono text-[0.75rem] font-normal leading-snug text-muted-foreground tabular-nums [overflow-wrap:anywhere] md:justify-end"
                          >
                            <span class="inline-flex max-w-full items-baseline gap-0">
                              {formatCostAmount(projectCostSumByKind(p, 'lastMonth'))}
                              <span
                                class="mx-px shrink-0 text-muted-foreground/50"
                                aria-hidden="true"
                              >·</span>
                              {formatCostAmount(projectCostSumByKind(p, 'predicted'))}
                            </span>
                          </span>
                        </span>
                        <span class="sr-only">
                          Current total, then last month and predicted.
                        </span>
                      </span>
                      <span class="min-w-0 text-muted-foreground md:truncate md:text-left">
                        <span class="md:hidden text-[0.65rem] uppercase tracking-wide text-muted-foreground/80"
                          >Template ·
                        </span>{p.templateLabel}
                      </span>
                      <span
                        class="text-muted-foreground tabular-nums md:block md:w-full md:text-right md:tracking-normal"
                      >
                        <span class="md:hidden text-[0.65rem] uppercase tracking-wide text-muted-foreground/80"
                          >Created ·
                        </span>{p.createdLabel}
                      </span>
                    </Accordion.Trigger>
                    <div
                      class="flex shrink-0 flex-wrap items-center justify-end gap-2 self-start overflow-visible py-3 pr-4 pl-1 md:min-w-[11rem] md:shrink md:self-auto md:px-3"
                    >
                      {#if p.isDraft}
                        <button
                          type="button"
                          class="{actionLinkClass} text-muted-foreground hover:text-foreground"
                          aria-label="Save"
                          onclick={(e) => {
                            e.stopPropagation();
                            saveDraftProject(p.id);
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          class="{actionLinkClass} text-muted-foreground hover:border-destructive/60 hover:text-destructive"
                          aria-label="Cancel"
                          onclick={(e) => {
                            e.stopPropagation();
                            discardDraftProject(p.id);
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                          </svg>
                        </button>
                      {:else if editingProjectId === p.id}
                        <button
                          type="button"
                          class="{actionLinkClass} text-muted-foreground hover:text-foreground"
                          aria-label="Save"
                          onclick={(e) => {
                            e.stopPropagation();
                            saveEditingProject();
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          class="{actionLinkClass} text-muted-foreground hover:border-destructive/60 hover:text-destructive"
                          aria-label="Cancel"
                          onclick={(e) => {
                            e.stopPropagation();
                            cancelEditingProject();
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                          </svg>
                        </button>
                      {:else}
                        <a
                          href={p.websiteUrl.trim() || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="{actionLinkClass} {!p.websiteUrl.trim() ? 'pointer-events-none opacity-40' : ''}"
                          aria-label={`Open website for ${p.name}`}
                          aria-disabled={!p.websiteUrl.trim()}
                          onclick={(e) => {
                            e.stopPropagation();
                            if (!p.websiteUrl.trim()) e.preventDefault();
                          }}
                        >
                          W
                        </a>
                        <a
                          href={p.githubUrl.trim() || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="{actionLinkClass} {!p.githubUrl.trim() ? 'pointer-events-none opacity-40' : ''}"
                          aria-label={`Open GitHub for ${p.name}`}
                          aria-disabled={!p.githubUrl.trim()}
                          onclick={(e) => {
                            e.stopPropagation();
                            if (!p.githubUrl.trim()) e.preventDefault();
                          }}
                        >
                          G
                        </a>
                        <a
                          href={p.awsSignInUrl.trim() || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="{actionLinkClass} {!p.awsSignInUrl.trim() ? 'pointer-events-none opacity-40' : ''}"
                          aria-label={`Open assign URL for ${p.name}`}
                          aria-disabled={!p.awsSignInUrl.trim()}
                          onclick={(e) => {
                            e.stopPropagation();
                            if (!p.awsSignInUrl.trim()) e.preventDefault();
                          }}
                        >
                          A
                        </a>
                        <button
                          type="button"
                          class="{actionLinkClass} text-muted-foreground hover:text-foreground"
                          aria-label="Edit project"
                          onclick={(e) => {
                            e.stopPropagation();
                            startEditingProject(p.id);
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.506l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
                          </svg>
                        </button>
                      {/if}
                    </div>
                  </div>
                </Accordion.Header>
                <Accordion.Content class="min-w-0 max-w-full overflow-x-hidden overflow-y-visible bg-muted/10 px-4 pb-5 pt-2">
                  {#if p.isDraft}
                    <div class="flex flex-col gap-6 pt-2">
                      <div class="grid gap-4 sm:grid-cols-2">
                        <div class={tripleFieldGridClass}>
                          <div class="flex min-w-0 flex-col gap-2">
                            <Label for={`${p.id}-name`} class="text-muted-foreground text-xs font-normal">
                              Project name
                            </Label>
                            <Input
                              id={`${p.id}-name`}
                              type="text"
                              value={p.name}
                              oninput={(e) => patchProject(p.id, { name: e.currentTarget.value })}
                              class="w-full min-w-0 rounded-sm border-border bg-transparent"
                            />
                          </div>
                          <div class="flex min-w-0 flex-col gap-2">
                            <Label for={`${p.id}-slug`} class="text-muted-foreground text-xs font-normal">
                              Slug
                            </Label>
                            <Input
                              id={`${p.id}-slug`}
                              type="text"
                              placeholder="e.g. new-project"
                              value={p.slug}
                              oninput={(e) => patchProject(p.id, { slug: e.currentTarget.value })}
                              class="w-full min-w-0 rounded-sm border-border bg-transparent font-mono text-[0.85rem]"
                            />
                          </div>
                          <div class="flex min-w-0 flex-col gap-2">
                            <Label for={`${p.id}-template`} class="text-muted-foreground text-xs font-normal">
                              Template
                            </Label>
                            <Input
                              id={`${p.id}-template`}
                              type="text"
                              placeholder="e.g. SST monorepo starter"
                              value={p.templateLabel}
                              oninput={(e) => patchProject(p.id, { templateLabel: e.currentTarget.value })}
                              class="w-full min-w-0 rounded-sm border-border bg-transparent"
                            />
                          </div>
                        </div>
                        <div class="flex w-full min-w-0 flex-col gap-2 sm:col-span-2">
                          <Label for={`${p.id}-blurb`} class="text-muted-foreground text-xs font-normal">
                            Description
                          </Label>
                          <textarea
                            id={`${p.id}-blurb`}
                            rows="3"
                            value={p.detailBlurb}
                            oninput={(e) => patchProject(p.id, { detailBlurb: e.currentTarget.value })}
                            class="min-h-[5rem] w-full min-w-0 resize-y rounded-sm border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            placeholder="Short summary of the stack and accounts…"
                          ></textarea>
                        </div>
                        <div class={tripleFieldGridClass}>
                          <div class="flex min-w-0 flex-col gap-2">
                            <Label for={`${p.id}-website`} class="text-muted-foreground text-xs font-normal">
                              Website URL
                            </Label>
                            <Input
                              id={`${p.id}-website`}
                              type="url"
                              placeholder="https://…"
                              value={p.websiteUrl}
                              oninput={(e) => patchProject(p.id, { websiteUrl: e.currentTarget.value })}
                              class="w-full min-w-0 rounded-sm border-border bg-transparent font-mono text-[0.85rem]"
                            />
                          </div>
                          <div class="flex min-w-0 flex-col gap-2">
                            <Label for={`${p.id}-github`} class="text-muted-foreground text-xs font-normal">
                              GitHub URL
                            </Label>
                            <Input
                              id={`${p.id}-github`}
                              type="url"
                              value={p.githubUrl}
                              oninput={(e) => patchProject(p.id, { githubUrl: e.currentTarget.value })}
                              class="w-full min-w-0 rounded-sm border-border bg-transparent font-mono text-[0.85rem]"
                            />
                          </div>
                          <div class="flex min-w-0 flex-col gap-2">
                            <Label for={`${p.id}-aws`} class="text-muted-foreground text-xs font-normal">
                              Assign URL
                            </Label>
                            <Input
                              id={`${p.id}-aws`}
                              type="url"
                              value={p.awsSignInUrl}
                              oninput={(e) => patchProject(p.id, { awsSignInUrl: e.currentTarget.value })}
                              class="w-full min-w-0 rounded-sm border-border bg-transparent font-mono text-[0.85rem]"
                            />
                          </div>
                        </div>
                      </div>

                      <div class="flex max-w-[8rem] flex-col gap-2">
                        <Label for={`${p.id}-acct-count`} class="text-muted-foreground text-xs font-normal">
                          Number of accounts
                        </Label>
                        <Input
                          id={`${p.id}-acct-count`}
                          type="number"
                          min={MIN_ACCOUNTS}
                          max={MAX_ACCOUNTS}
                          value={String(p.accountNames.length)}
                          oninput={(e) => onProjectAccountCountInput(p.id, e)}
                          class="rounded-sm border-border bg-transparent tabular-nums"
                        />
                        <p class="text-[0.7rem] text-neutral-600">
                          Between {MIN_ACCOUNTS} and {MAX_ACCOUNTS}.
                        </p>
                      </div>

                      <div class="min-w-0">
                        <div class="flex flex-col gap-3 md:hidden">
                          {#each p.accountNames as name, idx (`${p.id}-acct-m-${idx}`)}
                            {@const lastCell = awsCostCell(p.accountCostsLastMonth?.[idx])}
                            {@const curCell = awsCostCell(p.accountCostsCurrent?.[idx])}
                            {@const predCell = awsCostCell(p.accountCostsPredicted?.[idx])}
                            <div class={accountMobileCardClass}>
                              <div class="flex flex-col gap-1.5">
                                <span class={accountMobileFieldLabelClass}>Account name</span>
                                <Input
                                  type="text"
                                  placeholder="e.g. myapp-int"
                                  value={name}
                                  oninput={(e) => {
                                    const id = p.id;
                                    const i = idx;
                                    const v = e.currentTarget.value;
                                    projects = projects.map((x) => {
                                      if (x.id !== id) return x;
                                      const accountNames = x.accountNames.slice();
                                      accountNames[i] = v;
                                      return { ...x, accountNames };
                                    });
                                  }}
                                  class="h-9 w-full min-w-0 rounded-sm border-border bg-transparent text-sm"
                                />
                              </div>
                              <div class="flex flex-col gap-1.5">
                                <span class={accountMobileFieldLabelClass}>Email</span>
                                <span class="font-mono text-[0.75rem] text-foreground/90 break-all leading-snug">
                                  {accountAliasEmail(name, p.slug)}
                                </span>
                              </div>
                              <div
                                class="grid grid-cols-3 gap-2 rounded-sm border border-border/70 bg-background/40 px-2 py-2"
                              >
                                <div class="min-w-0 flex flex-col gap-0.5">
                                  <span class={accountMobileFieldLabelClass}>Last mo.</span>
                                  <span class="font-mono text-[0.8rem] text-foreground tabular-nums">
                                    {#if lastCell.show}
                                      {lastCell.amount}
                                    {:else}
                                      <span class="text-muted-foreground">—</span>
                                    {/if}
                                  </span>
                                </div>
                                <div class="min-w-0 flex flex-col gap-0.5">
                                  <span class={accountMobileFieldLabelClass}>Current</span>
                                  <span class="font-mono text-[0.8rem] text-foreground tabular-nums">
                                    {#if curCell.show}
                                      {curCell.amount}
                                    {:else}
                                      <span class="text-muted-foreground">—</span>
                                    {/if}
                                  </span>
                                </div>
                                <div class="min-w-0 flex flex-col gap-0.5">
                                  <span class={accountMobileFieldLabelClass}>Predicted</span>
                                  <span class="font-mono text-[0.8rem] text-foreground tabular-nums">
                                    {#if predCell.show}
                                      {predCell.amount}
                                    {:else}
                                      <span class="text-muted-foreground">—</span>
                                    {/if}
                                  </span>
                                </div>
                              </div>
                              <div class="flex flex-col gap-1.5">
                                <span class={accountMobileFieldLabelClass}>Account id</span>
                                <Input
                                  type="text"
                                  placeholder="—"
                                  value={p.accountHints?.[idx] ?? ''}
                                  oninput={(e) => {
                                    const id = p.id;
                                    const i = idx;
                                    const v = e.currentTarget.value;
                                    projects = projects.map((x) => {
                                      if (x.id !== id) return x;
                                      const hints = [...(x.accountHints ?? [])];
                                      while (hints.length <= i) hints.push('');
                                      hints[i] = v;
                                      return { ...x, accountHints: hints };
                                    });
                                  }}
                                  class="h-9 w-full min-w-0 rounded-sm border-border bg-transparent font-mono text-[0.8rem] tabular-nums"
                                />
                              </div>
                            </div>
                          {/each}
                        </div>
                        <div class="hidden min-w-0 md:block">
                          <table
                            class="w-full min-w-0 table-fixed border-collapse border border-border text-sm [overflow-wrap:anywhere]"
                          >
                            <colgroup>
                              <col class="w-[18%]" />
                              <col class="w-[22%]" />
                              <col class="w-[12%]" />
                              <col class="w-[12%]" />
                              <col class="w-[12%]" />
                              <col class="w-[24%]" />
                            </colgroup>
                            <thead>
                              <tr class="border-border border-b bg-muted/20 text-muted-foreground">
                                <th class="border-border border-b px-3 py-2 text-left font-medium tracking-wide uppercase">
                                  Account name
                                </th>
                                <th
                                  class="min-w-0 border-border border-b px-3 py-2 text-left font-medium tracking-wide uppercase"
                                >
                                  Email
                                </th>
                                <th class="border-border border-b px-2 py-2 text-left font-medium tracking-wide uppercase">
                                  Last mo.
                                </th>
                                <th class="border-border border-b px-2 py-2 text-left font-medium tracking-wide uppercase">
                                  Current
                                </th>
                                <th class="border-border border-b px-2 py-2 text-left font-medium tracking-wide uppercase">
                                  Predicted
                                </th>
                                <th class="border-border border-b px-3 py-2 text-left font-medium tracking-wide uppercase">
                                  Account id
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {#each p.accountNames as name, idx (`${p.id}-row-${idx}`)}
                                {@const lastCell = awsCostCell(p.accountCostsLastMonth?.[idx])}
                                {@const curCell = awsCostCell(p.accountCostsCurrent?.[idx])}
                                {@const predCell = awsCostCell(p.accountCostsPredicted?.[idx])}
                                <tr class="[&_td]:border-b [&_td]:border-border last:[&_td]:border-b-0">
                                  <td class="min-w-0 px-3 py-2 align-middle">
                                    <Input
                                      type="text"
                                      placeholder="e.g. myapp-int"
                                      value={name}
                                      oninput={(e) => {
                                        const id = p.id;
                                        const i = idx;
                                        const v = e.currentTarget.value;
                                        projects = projects.map((x) => {
                                          if (x.id !== id) return x;
                                          const accountNames = x.accountNames.slice();
                                          accountNames[i] = v;
                                          return { ...x, accountNames };
                                        });
                                      }}
                                      class="h-9 w-full min-w-0 rounded-sm border-border bg-transparent text-sm"
                                    />
                                  </td>
                                  <td class="min-w-0 px-3 py-2 align-middle">
                                    <span class="block w-full font-mono text-[0.75rem] text-foreground/90 break-all">
                                      {accountAliasEmail(name, p.slug)}
                                    </span>
                                  </td>
                                  <td class="min-w-0 px-2 py-2 align-middle font-mono text-[0.75rem] text-foreground tabular-nums">
                                    {#if lastCell.show}
                                      {lastCell.amount}
                                    {:else}
                                      <span class="text-muted-foreground">—</span>
                                    {/if}
                                  </td>
                                  <td class="min-w-0 px-2 py-2 align-middle font-mono text-[0.75rem] text-foreground tabular-nums">
                                    {#if curCell.show}
                                      {curCell.amount}
                                    {:else}
                                      <span class="text-muted-foreground">—</span>
                                    {/if}
                                  </td>
                                  <td class="min-w-0 px-2 py-2 align-middle font-mono text-[0.75rem] text-foreground tabular-nums">
                                    {#if predCell.show}
                                      {predCell.amount}
                                    {:else}
                                      <span class="text-muted-foreground">—</span>
                                    {/if}
                                  </td>
                                  <td class="min-w-0 px-3 py-2 align-middle">
                                    <Input
                                      type="text"
                                      placeholder="—"
                                      value={p.accountHints?.[idx] ?? ''}
                                      oninput={(e) => {
                                        const id = p.id;
                                        const i = idx;
                                        const v = e.currentTarget.value;
                                        projects = projects.map((x) => {
                                          if (x.id !== id) return x;
                                          const hints = [...(x.accountHints ?? [])];
                                          while (hints.length <= i) hints.push('');
                                          hints[i] = v;
                                          return { ...x, accountHints: hints };
                                        });
                                      }}
                                      class="h-9 w-full min-w-0 rounded-sm border-border bg-transparent font-mono text-[0.8rem] tabular-nums"
                                    />
                                  </td>
                                </tr>
                              {/each}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  {:else if editingProjectId === p.id}
                    <div class="flex flex-col gap-6 pt-2">
                      <div class="grid gap-4 sm:grid-cols-2">
                        <div class={tripleFieldGridClass}>
                          <div class="flex min-w-0 flex-col gap-2">
                            <Label for={`${p.id}-edit-name`} class="text-muted-foreground text-xs font-normal">
                              Project name
                            </Label>
                            <Input
                              id={`${p.id}-edit-name`}
                              type="text"
                              value={p.name}
                              oninput={(e) => patchProject(p.id, { name: e.currentTarget.value })}
                              class="w-full min-w-0 rounded-sm border-border bg-transparent"
                            />
                          </div>
                          <div class="flex min-w-0 flex-col gap-1">
                            <span class="text-muted-foreground text-xs font-normal">Slug</span>
                            <span class="font-mono text-sm text-foreground break-all">{slugify(p.slug) || '—'}</span>
                          </div>
                          <div class="flex min-w-0 flex-col gap-1">
                            <span class="text-muted-foreground text-xs font-normal">Template</span>
                            <span class="text-sm text-foreground break-words">{p.templateLabel || '—'}</span>
                          </div>
                        </div>
                        <p class="text-[0.65rem] text-muted-foreground leading-snug sm:col-span-2">
                          Slug, template, and accounts stay fixed after the project is created.
                        </p>
                        <div class="flex w-full min-w-0 flex-col gap-2 sm:col-span-2">
                          <Label for={`${p.id}-edit-blurb`} class="text-muted-foreground text-xs font-normal">
                            Description
                          </Label>
                          <textarea
                            id={`${p.id}-edit-blurb`}
                            rows="3"
                            value={p.detailBlurb}
                            oninput={(e) => patchProject(p.id, { detailBlurb: e.currentTarget.value })}
                            class="min-h-[5rem] w-full min-w-0 resize-y rounded-sm border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            placeholder="Short summary…"
                          ></textarea>
                        </div>
                        <div class={tripleFieldGridClass}>
                          <div class="flex min-w-0 flex-col gap-2">
                            <Label for={`${p.id}-edit-website`} class="text-muted-foreground text-xs font-normal">
                              Website URL
                            </Label>
                            <Input
                              id={`${p.id}-edit-website`}
                              type="url"
                              placeholder="https://…"
                              value={p.websiteUrl}
                              oninput={(e) => patchProject(p.id, { websiteUrl: e.currentTarget.value })}
                              class="w-full min-w-0 rounded-sm border-border bg-transparent font-mono text-[0.85rem]"
                            />
                          </div>
                          <div class="flex min-w-0 flex-col gap-2">
                            <Label for={`${p.id}-edit-github`} class="text-muted-foreground text-xs font-normal">
                              GitHub URL
                            </Label>
                            <Input
                              id={`${p.id}-edit-github`}
                              type="url"
                              value={p.githubUrl}
                              oninput={(e) => patchProject(p.id, { githubUrl: e.currentTarget.value })}
                              class="w-full min-w-0 rounded-sm border-border bg-transparent font-mono text-[0.85rem]"
                            />
                          </div>
                          <div class="flex min-w-0 flex-col gap-2">
                            <Label for={`${p.id}-edit-assign`} class="text-muted-foreground text-xs font-normal">
                              Assign URL
                            </Label>
                            <Input
                              id={`${p.id}-edit-assign`}
                              type="url"
                              value={p.awsSignInUrl}
                              oninput={(e) => patchProject(p.id, { awsSignInUrl: e.currentTarget.value })}
                              class="w-full min-w-0 rounded-sm border-border bg-transparent font-mono text-[0.85rem]"
                            />
                          </div>
                        </div>
                      </div>

                      <div class="min-w-0">
                        <div class="flex flex-col gap-3 md:hidden">
                          {#each p.accountNames as name, idx (`${p.id}-edit-acct-m-${idx}`)}
                            {@const accountIdHint = p.accountHints?.[idx]}
                            {@const lastCell = awsCostCell(p.accountCostsLastMonth?.[idx])}
                            {@const curCell = awsCostCell(p.accountCostsCurrent?.[idx])}
                            {@const predCell = awsCostCell(p.accountCostsPredicted?.[idx])}
                            <div class={accountMobileCardClass}>
                              <div class="flex flex-col gap-1.5">
                                <span class={accountMobileFieldLabelClass}>Account name</span>
                                <span class="text-sm font-medium text-foreground break-words">{name}</span>
                              </div>
                              <div class="flex flex-col gap-1.5">
                                <span class={accountMobileFieldLabelClass}>Email</span>
                                <span class="font-mono text-[0.75rem] text-foreground/90 break-all leading-snug">
                                  {accountAliasEmail(name, p.slug)}
                                </span>
                              </div>
                              <div
                                class="grid grid-cols-3 gap-2 rounded-sm border border-border/70 bg-background/40 px-2 py-2"
                              >
                                <div class="min-w-0 flex flex-col gap-0.5">
                                  <span class={accountMobileFieldLabelClass}>Last mo.</span>
                                  <span class="font-mono text-[0.8rem] text-foreground tabular-nums">
                                    {#if lastCell.show}
                                      {lastCell.amount}
                                    {:else}
                                      <span class="text-muted-foreground">—</span>
                                    {/if}
                                  </span>
                                </div>
                                <div class="min-w-0 flex flex-col gap-0.5">
                                  <span class={accountMobileFieldLabelClass}>Current</span>
                                  <span class="font-mono text-[0.8rem] text-foreground tabular-nums">
                                    {#if curCell.show}
                                      {curCell.amount}
                                    {:else}
                                      <span class="text-muted-foreground">—</span>
                                    {/if}
                                  </span>
                                </div>
                                <div class="min-w-0 flex flex-col gap-0.5">
                                  <span class={accountMobileFieldLabelClass}>Predicted</span>
                                  <span class="font-mono text-[0.8rem] text-foreground tabular-nums">
                                    {#if predCell.show}
                                      {predCell.amount}
                                    {:else}
                                      <span class="text-muted-foreground">—</span>
                                    {/if}
                                  </span>
                                </div>
                              </div>
                              <div class="flex flex-col gap-1.5">
                                <span class={accountMobileFieldLabelClass}>Account id</span>
                                <span class="font-mono text-[0.8rem] text-muted-foreground tabular-nums break-all">
                                  {#if (accountIdHint ?? '').trim()}
                                    {accountIdHint}
                                  {:else}
                                    —
                                  {/if}
                                </span>
                              </div>
                            </div>
                          {/each}
                        </div>
                        <div class="hidden min-w-0 md:block">
                          <table
                            class="w-full min-w-0 table-fixed border-collapse border border-border text-sm [overflow-wrap:anywhere]"
                          >
                            <colgroup>
                              <col class="w-[18%]" />
                              <col class="w-[22%]" />
                              <col class="w-[12%]" />
                              <col class="w-[12%]" />
                              <col class="w-[12%]" />
                              <col class="w-[24%]" />
                            </colgroup>
                            <thead>
                              <tr class="border-border border-b bg-muted/20 text-muted-foreground">
                                <th class="border-border border-b px-3 py-2 text-left font-medium tracking-wide uppercase">
                                  Account name
                                </th>
                                <th
                                  class="min-w-0 border-border border-b px-3 py-2 text-left font-medium tracking-wide uppercase"
                                >
                                  Email
                                </th>
                                <th class="border-border border-b px-2 py-2 text-left font-medium tracking-wide uppercase">
                                  Last mo.
                                </th>
                                <th class="border-border border-b px-2 py-2 text-left font-medium tracking-wide uppercase">
                                  Current
                                </th>
                                <th class="border-border border-b px-2 py-2 text-left font-medium tracking-wide uppercase">
                                  Predicted
                                </th>
                                <th class="border-border border-b px-3 py-2 text-left font-medium tracking-wide uppercase">
                                  Account id
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {#each p.accountNames as name, idx (`${p.id}-edit-acct-${idx}`)}
                                {@const accountIdHint = p.accountHints?.[idx]}
                                {@const lastCell = awsCostCell(p.accountCostsLastMonth?.[idx])}
                                {@const curCell = awsCostCell(p.accountCostsCurrent?.[idx])}
                                {@const predCell = awsCostCell(p.accountCostsPredicted?.[idx])}
                                <tr class="[&_td]:border-b [&_td]:border-border last:[&_td]:border-b-0">
                                  <td class="min-w-0 break-words px-3 py-2 font-medium text-foreground">
                                    {name}
                                  </td>
                                  <td class="min-w-0 px-3 py-2">
                                    <span class="block w-full font-mono text-[0.75rem] text-foreground/90 break-all">
                                      {accountAliasEmail(name, p.slug)}
                                    </span>
                                  </td>
                                  <td class="min-w-0 px-2 py-2 font-mono text-[0.75rem] text-foreground tabular-nums">
                                    {#if lastCell.show}
                                      {lastCell.amount}
                                    {:else}
                                      <span class="text-muted-foreground">—</span>
                                    {/if}
                                  </td>
                                  <td class="min-w-0 px-2 py-2 font-mono text-[0.75rem] text-foreground tabular-nums">
                                    {#if curCell.show}
                                      {curCell.amount}
                                    {:else}
                                      <span class="text-muted-foreground">—</span>
                                    {/if}
                                  </td>
                                  <td class="min-w-0 px-2 py-2 font-mono text-[0.75rem] text-foreground tabular-nums">
                                    {#if predCell.show}
                                      {predCell.amount}
                                    {:else}
                                      <span class="text-muted-foreground">—</span>
                                    {/if}
                                  </td>
                                  <td class="min-w-0 break-all px-3 py-2 font-mono text-[0.8rem] text-muted-foreground tabular-nums">
                                    {#if (accountIdHint ?? '').trim()}
                                      {accountIdHint}
                                    {:else}
                                      —
                                    {/if}
                                  </td>
                                </tr>
                              {/each}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  {:else}
                    <div class="flex flex-col gap-6 pt-2">
                      <div class="grid gap-4 sm:grid-cols-2">
                        <div class={tripleFieldGridClass}>
                          <div class="flex min-w-0 flex-col gap-1">
                            <span class="text-muted-foreground text-xs font-normal">Project name</span>
                            <span class="text-sm text-foreground break-words">{p.name}</span>
                          </div>
                          <div class="flex min-w-0 flex-col gap-1">
                            <span class="text-muted-foreground text-xs font-normal">Slug</span>
                            <span class="font-mono text-sm text-foreground break-all">{slugify(p.slug) || '—'}</span>
                          </div>
                          <div class="flex min-w-0 flex-col gap-1">
                            <span class="text-muted-foreground text-xs font-normal">Template</span>
                            <span class="text-sm text-foreground break-words">{p.templateLabel || '—'}</span>
                          </div>
                        </div>
                        {#if p.detailBlurb.trim()}
                          <div class="flex w-full min-w-0 flex-col gap-1 sm:col-span-2">
                            <span class="text-muted-foreground text-xs font-normal">Description</span>
                            <p class="w-full min-w-0 text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                              {p.detailBlurb}
                            </p>
                          </div>
                        {/if}
                        <div class={tripleFieldGridClass}>
                          <div class="flex min-w-0 flex-col gap-1">
                            <span class="text-muted-foreground text-xs font-normal">Website URL</span>
                            {#if p.websiteUrl.trim()}
                              <a
                                href={p.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="break-all font-mono text-[0.85rem] text-foreground/90 underline underline-offset-2 hover:text-foreground"
                              >
                                {p.websiteUrl}
                              </a>
                            {:else}
                              <span class="text-sm text-muted-foreground">—</span>
                            {/if}
                          </div>
                          <div class="flex min-w-0 flex-col gap-1">
                            <span class="text-muted-foreground text-xs font-normal">GitHub URL</span>
                            {#if p.githubUrl.trim()}
                              <a
                                href={p.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="break-all font-mono text-[0.85rem] text-foreground/90 underline underline-offset-2 hover:text-foreground"
                              >
                                {p.githubUrl}
                              </a>
                            {:else}
                              <span class="text-sm text-muted-foreground">—</span>
                            {/if}
                          </div>
                          <div class="flex min-w-0 flex-col gap-1">
                            <span class="text-muted-foreground text-xs font-normal">Assign URL</span>
                            {#if p.awsSignInUrl.trim()}
                              <a
                                href={p.awsSignInUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="break-all font-mono text-[0.85rem] text-foreground/90 underline underline-offset-2 hover:text-foreground"
                              >
                                {p.awsSignInUrl}
                              </a>
                            {:else}
                              <span class="text-sm text-muted-foreground">—</span>
                            {/if}
                          </div>
                        </div>
                      </div>

                      <div class="min-w-0">
                        <div class="flex flex-col gap-3 md:hidden">
                          {#each p.accountNames as name, idx (`${p.id}-readonly-acct-m-${idx}`)}
                            {@const accountIdHint = p.accountHints?.[idx]}
                            {@const lastCell = awsCostCell(p.accountCostsLastMonth?.[idx])}
                            {@const curCell = awsCostCell(p.accountCostsCurrent?.[idx])}
                            {@const predCell = awsCostCell(p.accountCostsPredicted?.[idx])}
                            <div class={accountMobileCardClass}>
                              <div class="flex flex-col gap-1.5">
                                <span class={accountMobileFieldLabelClass}>Account name</span>
                                <span class="text-sm font-medium text-foreground break-words">{name}</span>
                              </div>
                              <div class="flex flex-col gap-1.5">
                                <span class={accountMobileFieldLabelClass}>Email</span>
                                <span class="font-mono text-[0.75rem] text-foreground/90 break-all leading-snug">
                                  {accountAliasEmail(name, p.slug)}
                                </span>
                              </div>
                              <div
                                class="grid grid-cols-3 gap-2 rounded-sm border border-border/70 bg-background/40 px-2 py-2"
                              >
                                <div class="min-w-0 flex flex-col gap-0.5">
                                  <span class={accountMobileFieldLabelClass}>Last mo.</span>
                                  <span class="font-mono text-[0.8rem] text-foreground tabular-nums">
                                    {#if lastCell.show}
                                      {lastCell.amount}
                                    {:else}
                                      <span class="text-muted-foreground">—</span>
                                    {/if}
                                  </span>
                                </div>
                                <div class="min-w-0 flex flex-col gap-0.5">
                                  <span class={accountMobileFieldLabelClass}>Current</span>
                                  <span class="font-mono text-[0.8rem] text-foreground tabular-nums">
                                    {#if curCell.show}
                                      {curCell.amount}
                                    {:else}
                                      <span class="text-muted-foreground">—</span>
                                    {/if}
                                  </span>
                                </div>
                                <div class="min-w-0 flex flex-col gap-0.5">
                                  <span class={accountMobileFieldLabelClass}>Predicted</span>
                                  <span class="font-mono text-[0.8rem] text-foreground tabular-nums">
                                    {#if predCell.show}
                                      {predCell.amount}
                                    {:else}
                                      <span class="text-muted-foreground">—</span>
                                    {/if}
                                  </span>
                                </div>
                              </div>
                              <div class="flex flex-col gap-1.5">
                                <span class={accountMobileFieldLabelClass}>Account id</span>
                                <span class="font-mono text-[0.8rem] text-muted-foreground tabular-nums break-all">
                                  {#if (accountIdHint ?? '').trim()}
                                    {accountIdHint}
                                  {:else}
                                    —
                                  {/if}
                                </span>
                              </div>
                            </div>
                          {/each}
                        </div>
                        <div class="hidden min-w-0 md:block">
                          <table
                            class="w-full min-w-0 table-fixed border-collapse border border-border text-sm [overflow-wrap:anywhere]"
                          >
                            <colgroup>
                              <col class="w-[18%]" />
                              <col class="w-[22%]" />
                              <col class="w-[12%]" />
                              <col class="w-[12%]" />
                              <col class="w-[12%]" />
                              <col class="w-[24%]" />
                            </colgroup>
                            <thead>
                              <tr class="border-border border-b bg-muted/20 text-muted-foreground">
                                <th class="border-border border-b px-3 py-2 text-left font-medium tracking-wide uppercase">
                                  Account name
                                </th>
                                <th
                                  class="min-w-0 border-border border-b px-3 py-2 text-left font-medium tracking-wide uppercase"
                                >
                                  Email
                                </th>
                                <th class="border-border border-b px-2 py-2 text-left font-medium tracking-wide uppercase">
                                  Last mo.
                                </th>
                                <th class="border-border border-b px-2 py-2 text-left font-medium tracking-wide uppercase">
                                  Current
                                </th>
                                <th class="border-border border-b px-2 py-2 text-left font-medium tracking-wide uppercase">
                                  Predicted
                                </th>
                                <th class="border-border border-b px-3 py-2 text-left font-medium tracking-wide uppercase">
                                  Account id
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {#each p.accountNames as name, idx (`${p.id}-readonly-acct-${idx}`)}
                                {@const accountIdHint = p.accountHints?.[idx]}
                                {@const lastCell = awsCostCell(p.accountCostsLastMonth?.[idx])}
                                {@const curCell = awsCostCell(p.accountCostsCurrent?.[idx])}
                                {@const predCell = awsCostCell(p.accountCostsPredicted?.[idx])}
                                <tr class="[&_td]:border-b [&_td]:border-border last:[&_td]:border-b-0">
                                  <td class="min-w-0 break-words px-3 py-2 font-medium text-foreground">
                                    {name}
                                  </td>
                                  <td class="min-w-0 px-3 py-2">
                                    <span class="block w-full font-mono text-[0.75rem] text-foreground/90 break-all">
                                      {accountAliasEmail(name, p.slug)}
                                    </span>
                                  </td>
                                  <td class="min-w-0 px-2 py-2 font-mono text-[0.75rem] text-foreground tabular-nums">
                                    {#if lastCell.show}
                                      {lastCell.amount}
                                    {:else}
                                      <span class="text-muted-foreground">—</span>
                                    {/if}
                                  </td>
                                  <td class="min-w-0 px-2 py-2 font-mono text-[0.75rem] text-foreground tabular-nums">
                                    {#if curCell.show}
                                      {curCell.amount}
                                    {:else}
                                      <span class="text-muted-foreground">—</span>
                                    {/if}
                                  </td>
                                  <td class="min-w-0 px-2 py-2 font-mono text-[0.75rem] text-foreground tabular-nums">
                                    {#if predCell.show}
                                      {predCell.amount}
                                    {:else}
                                      <span class="text-muted-foreground">—</span>
                                    {/if}
                                  </td>
                                  <td class="min-w-0 break-all px-3 py-2 font-mono text-[0.8rem] text-muted-foreground tabular-nums">
                                    {#if (accountIdHint ?? '').trim()}
                                      {accountIdHint}
                                    {:else}
                                      —
                                    {/if}
                                  </td>
                                </tr>
                              {/each}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  {/if}
                </Accordion.Content>
              </Accordion.Item>
            {/each}
          </Accordion.Root>
        </div>
      {/if}
    </div>

    <p class="mt-12 text-center text-[0.7rem] text-neutral-600">Design preview — stored in-page only</p>
  </div>

  {#if showScrollDownChevron}
    <button
      type="button"
      class="pointer-events-auto fixed bottom-6 left-1/2 z-30 flex size-10 -translate-x-1/2 items-center justify-center border border-border bg-background/95 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-muted/30 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      aria-label="Scroll down"
      onclick={scrollPageDownStep}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        class="translate-y-px"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  {/if}
</main>
