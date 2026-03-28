<script lang="ts">
import { Accordion } from 'bits-ui';
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';

type ProjectRow = {
  id: string;
  name: string;
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
};

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Plus-address local part + domain — tag is `{project-slug}-{account}` (e.g. `my-app-int`) */
const ACCOUNT_EMAIL_LOCAL = 'jwyprzal';
const ACCOUNT_EMAIL_DOMAIN = 'example.com';

function accountAliasEmail(accountName: string, projectSlug: string, projectName: string) {
  const projectPart =
    slugify(projectSlug) || slugify(projectName) || 'project';
  const accountPart = slugify(accountName) || 'account';
  const tag = `${projectPart}-${accountPart}`;
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
  const n = projects.length + 1;
  const id = crypto.randomUUID();
  const placeholderSlug = `new-project-${n}`;
  projects = [
    {
      id,
      name: 'New project',
      slug: placeholderSlug,
      accountNames: ['int', 'stage', 'prod'],
      createdLabel: shortDate(new Date()),
      templateLabel: '',
      detailBlurb: '',
      accountHints: ['', '', ''],
      websiteUrl: '',
      githubUrl: DEFAULT_GITHUB_URL,
      awsSignInUrl: DEFAULT_AWS_SIGNIN_URL,
    },
    ...projects,
  ];
  accordionValue = [id];
}

function deleteProject(id: string) {
  projects = projects.filter((p) => p.id !== id);
  accordionValue = accordionValue.filter((v) => v !== id);
}

function setAccountCount(projectId: string, count: number) {
  const target = clampCount(count);
  projects = projects.map((p) => {
    if (p.id !== projectId) return p;
    let names = p.accountNames.slice(0, target);
    while (names.length < target) names.push('');
    let hints = (p.accountHints ?? []).slice(0, target);
    while (hints.length < target) hints.push('');
    return { ...p, accountNames: names, accountHints: hints };
  });
}

function onProjectAccountCountInput(projectId: string, e: Event & { currentTarget: HTMLInputElement }) {
  const v = Number.parseInt(e.currentTarget.value, 10);
  setAccountCount(projectId, Number.isFinite(v) ? v : MIN_ACCOUNTS);
}

function patchProject(id: string, patch: Partial<ProjectRow>) {
  projects = projects.map((p) => (p.id === id ? { ...p, ...patch } : p));
}

type SortKey = 'name' | 'template' | 'created' | 'accounts';

let sortKey = $state<SortKey | null>(null);
let sortDir = $state<'asc' | 'desc'>('asc');

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

/** Chevron first, then name | template | created | account count (inside accordion trigger) */
const summaryTriggerGridClass =
  'grid min-h-14 min-w-0 flex-1 grid-cols-1 items-center gap-x-3 gap-y-1 py-3 pr-2 pl-4 text-left sm:grid-cols-[2rem_minmax(0,1fr)_minmax(0,10rem)_10.5rem_3.5rem] sm:gap-x-4';

/** Header row: same grid columns as trigger + space for actions */
const headerLeftGridClass =
  'grid min-w-0 flex-1 grid-cols-1 px-4 py-3 text-left text-muted-foreground text-xs sm:grid sm:grid-cols-[2rem_minmax(0,1fr)_minmax(0,10rem)_10.5rem_3.5rem] sm:gap-x-4';
</script>

<svelte:head>
  <title>Projects — Admin project factory</title>
</svelte:head>

<main
  class="min-h-dvh min-w-0 max-w-full overflow-x-hidden px-6 pt-28 pb-16 md:px-10 md:pt-32 md:pb-20 lg:px-14 lg:pt-36"
>
  <div class="mx-auto w-full min-w-0 max-w-3xl">
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
        <div class="min-w-0 overflow-hidden border border-border text-sm">
          <div
            class="hidden w-full flex-col border-border border-b sm:flex sm:flex-row sm:items-stretch"
          >
            <div class={headerLeftGridClass}>
              <span class="block sm:min-w-[2rem]" aria-hidden="true"></span>
              <div class="hidden min-w-0 sm:block">
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
              <div class="hidden min-w-0 sm:block">
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
              <div class="hidden sm:flex sm:justify-end">
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
              <div class="hidden sm:flex sm:justify-end">
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
            </div>
            <div
              class="flex items-center justify-end gap-2 px-4 py-3 text-muted-foreground text-xs font-medium tracking-wide uppercase sm:min-w-[8rem] sm:px-3"
            >
              Actions
            </div>
          </div>

          <Accordion.Root type="multiple" class="min-w-0 divide-y divide-border" bind:value={accordionValue}>
            {#each displayedProjects as p (p.id)}
              <Accordion.Item value={p.id} class="min-w-0 overflow-x-hidden border-0">
                <Accordion.Header class="m-0 p-0">
                  <div class="flex w-full min-w-0 max-w-full flex-col sm:flex-row sm:items-stretch">
                    <Accordion.Trigger
                      class="{summaryTriggerGridClass} rounded-none border-0 bg-transparent text-left transition-colors hover:bg-muted/15 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&[data-state=open]_svg]:rotate-180"
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
                        class="shrink-0 justify-self-start text-muted-foreground transition-transform duration-200 sm:mx-auto sm:justify-self-center"
                        aria-hidden="true"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                      <span class="min-w-0 font-medium text-foreground">{p.name}</span>
                      <span
                        class="min-w-0 text-muted-foreground sm:truncate sm:text-left"
                        title={p.templateLabel}
                      >
                        <span class="sm:hidden text-[0.65rem] uppercase tracking-wide text-muted-foreground/80"
                          >Template ·
                        </span>{p.templateLabel}
                      </span>
                      <span
                        class="text-muted-foreground tabular-nums sm:block sm:w-full sm:text-right sm:tracking-normal"
                      >
                        <span class="sm:hidden text-[0.65rem] uppercase tracking-wide text-muted-foreground/80"
                          >Created ·
                        </span>{p.createdLabel}
                      </span>
                      <span class="text-muted-foreground tabular-nums sm:text-right">
                        <span class="sm:hidden text-[0.65rem] uppercase tracking-wide text-muted-foreground/80"
                          >Accounts ·
                        </span>{p.accountNames.length}
                      </span>
                    </Accordion.Trigger>
                    <div
                      class="flex items-center justify-end gap-2 py-3 pr-4 pl-2 sm:min-w-[8rem] sm:px-3"
                    >
                      <a
                        href={p.websiteUrl.trim() || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="{actionLinkClass} {!p.websiteUrl.trim() ? 'pointer-events-none opacity-40' : ''}"
                        title="Website"
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
                        title="GitHub"
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
                        title="AWS sign-in"
                        aria-label={`Open AWS sign-in for ${p.name}`}
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
                        class="{actionLinkClass} text-[0.65rem] hover:border-destructive/60 hover:text-destructive"
                        title="Remove project"
                        aria-label={`Remove ${p.name}`}
                        onclick={(e) => {
                          e.stopPropagation();
                          deleteProject(p.id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </Accordion.Header>
                <Accordion.Content class="min-w-0 max-w-full overflow-x-hidden bg-muted/10 px-4 pb-5 pt-2">
                  <div class="flex flex-col gap-6 pt-2">
                    <div class="grid gap-4 sm:grid-cols-2">
                      <div class="flex flex-col gap-2 sm:col-span-2">
                        <Label for={`${p.id}-name`} class="text-muted-foreground text-xs font-normal">
                          Project name
                        </Label>
                        <Input
                          id={`${p.id}-name`}
                          type="text"
                          value={p.name}
                          oninput={(e) => patchProject(p.id, { name: e.currentTarget.value })}
                          class="rounded-sm border-border bg-transparent"
                        />
                      </div>
                      <div class="flex flex-col gap-2">
                        <Label for={`${p.id}-slug`} class="text-muted-foreground text-xs font-normal">
                          Slug
                        </Label>
                        <Input
                          id={`${p.id}-slug`}
                          type="text"
                          value={p.slug}
                          oninput={(e) => patchProject(p.id, { slug: e.currentTarget.value })}
                          class="rounded-sm border-border bg-transparent font-mono text-[0.85rem]"
                        />
                      </div>
                      <div class="flex flex-col gap-2">
                        <Label for={`${p.id}-template`} class="text-muted-foreground text-xs font-normal">
                          Template
                        </Label>
                        <Input
                          id={`${p.id}-template`}
                          type="text"
                          placeholder="e.g. SST monorepo starter"
                          value={p.templateLabel}
                          oninput={(e) => patchProject(p.id, { templateLabel: e.currentTarget.value })}
                          class="rounded-sm border-border bg-transparent"
                        />
                      </div>
                      <div class="flex flex-col gap-2 sm:col-span-2">
                        <Label for={`${p.id}-blurb`} class="text-muted-foreground text-xs font-normal">
                          Description
                        </Label>
                        <textarea
                          id={`${p.id}-blurb`}
                          rows="3"
                          value={p.detailBlurb}
                          oninput={(e) => patchProject(p.id, { detailBlurb: e.currentTarget.value })}
                          class="min-h-[5rem] resize-y rounded-sm border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          placeholder="Short summary of the stack and accounts…"
                        ></textarea>
                      </div>
                      <div class="flex flex-col gap-2 sm:col-span-2">
                        <Label for={`${p.id}-website`} class="text-muted-foreground text-xs font-normal">
                          Website URL
                        </Label>
                        <Input
                          id={`${p.id}-website`}
                          type="url"
                          placeholder="https://…"
                          value={p.websiteUrl}
                          oninput={(e) => patchProject(p.id, { websiteUrl: e.currentTarget.value })}
                          class="rounded-sm border-border bg-transparent font-mono text-[0.85rem]"
                        />
                      </div>
                      <div class="flex flex-col gap-2">
                        <Label for={`${p.id}-github`} class="text-muted-foreground text-xs font-normal">
                          GitHub URL
                        </Label>
                        <Input
                          id={`${p.id}-github`}
                          type="url"
                          value={p.githubUrl}
                          oninput={(e) => patchProject(p.id, { githubUrl: e.currentTarget.value })}
                          class="rounded-sm border-border bg-transparent font-mono text-[0.85rem]"
                        />
                      </div>
                      <div class="flex flex-col gap-2">
                        <Label for={`${p.id}-aws`} class="text-muted-foreground text-xs font-normal">
                          AWS sign-in URL
                        </Label>
                        <Input
                          id={`${p.id}-aws`}
                          type="url"
                          value={p.awsSignInUrl}
                          oninput={(e) => patchProject(p.id, { awsSignInUrl: e.currentTarget.value })}
                          class="rounded-sm border-border bg-transparent font-mono text-[0.85rem]"
                        />
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
                      <span class="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        Accounts
                      </span>
                      <table
                        class="mt-3 w-full table-fixed border-collapse border border-border text-sm [overflow-wrap:anywhere]"
                      >
                        <thead>
                          <tr class="border-border border-b bg-muted/20 text-muted-foreground">
                            <th class="w-[28%] px-3 py-2 text-left font-medium tracking-wide uppercase">
                              Account name
                            </th>
                            <th class="min-w-0 px-3 py-2 text-left font-medium tracking-wide uppercase">
                              Email
                            </th>
                            <th class="w-[26%] px-3 py-2 text-left font-medium tracking-wide uppercase">
                              Account id
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {#each p.accountNames as name, idx (`${p.id}-row-${idx}`)}
                            <tr class="border-border border-b last:border-b-0">
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
                                  class="h-9 rounded-sm border-border bg-transparent text-sm"
                                />
                              </td>
                              <td class="min-w-0 px-3 py-2 align-middle">
                                <span class="font-mono text-[0.75rem] text-foreground/90 break-all">
                                  {accountAliasEmail(name, p.slug, p.name)}
                                </span>
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
                                  class="h-9 rounded-sm border-border bg-transparent font-mono text-[0.8rem] tabular-nums"
                                />
                              </td>
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            {/each}
          </Accordion.Root>
        </div>
      {/if}
    </div>

    <p class="mt-12 text-center text-[0.7rem] text-neutral-600">Design preview — stored in-page only</p>
  </div>
</main>
