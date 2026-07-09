import { SparklesIcon } from '@/assets/icons/sparkles'

/** Micro-visuals for the capability cells — hand-set forge panels. */

export function ModuleTreeVisual() {
  const rows: Array<[string, string]> = [
    ['├─ models/', 'table-named'],
    ['├─ service.ts', 'typed CRUD'],
    ['├─ config/', 'zod-validated'],
    ['├─ migrations/', 'reversible'],
    ['└─ workflows/', 'sagas'],
  ]
  return (
    <div className="forge rounded-lg border border-line bg-canvas p-4 font-mono text-xs leading-loose">
      <p className="text-code-key">src/modules/billing/</p>
      {rows.map(([file, note]) => (
        <p key={file} className="flex justify-between gap-4">
          <span className="text-code-plain">{file}</span>
          <span className="truncate text-code-comment">{note}</span>
        </p>
      ))}
    </div>
  )
}

export function OrmVisual() {
  return (
    <div className="forge overflow-x-auto rounded-lg border border-line bg-canvas p-4 font-mono text-xs leading-loose">
      <p className="whitespace-pre">
        <span className="text-code-plain">model(</span>
        <span className="text-code-str">&quot;users&quot;</span>
        <span className="text-code-plain">, {'{'}</span>
      </p>
      <p className="whitespace-pre">
        <span className="text-code-plain">{'  '}id: columns.id({'{'} prefix: </span>
        <span className="text-code-str">&quot;usr&quot;</span>
        <span className="text-code-plain"> {'}'}),</span>
      </p>
      <p className="whitespace-pre">
        <span className="text-code-plain">{'  '}email: columns.text().unique(),</span>
      </p>
      <p className="whitespace-pre">
        <span className="text-code-plain">{'  '}sessions: columns.hasMany(</span>
        <span className="text-code-str">&quot;sessions&quot;</span>
        <span className="text-code-plain">),</span>
      </p>
      <p className="whitespace-pre">
        <span className="text-code-plain">{'}'}).timestamps()</span>
        <span className="text-code-dim">;</span>
      </p>
    </div>
  )
}

export function WorkflowVisual() {
  return (
    <div className="forge rounded-lg border border-line bg-canvas p-4 font-mono text-2xs">
      <div className="flex flex-wrap items-center gap-2">
        {['create-profile', 'send-welcome'].map((step, i) => (
          <span key={step} className="flex items-center gap-2">
            {i > 0 && <span className="text-code-dim">─►</span>}
            <span className="rounded border border-line bg-surface px-2 py-1 text-code-plain">
              {step}
            </span>
          </span>
        ))}
        <span className="text-code-dim">─►</span>
        <span className="text-code-ok">done</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-code-key">⤺</span>
        <span className="text-code-comment">on failure: compensations run in reverse</span>
      </div>
    </div>
  )
}

export function HttpVisual() {
  const routes: Array<[string, string, string]> = [
    ['routes/posts/route.ts', 'POST', '/api/posts'],
    ['routes/users/[userId]/', 'GET', '/api/users/:userId'],
  ]
  return (
    <div className="forge rounded-lg border border-line bg-canvas p-4 font-mono text-2xs leading-loose">
      {routes.map(([file, method, url]) => (
        <p key={url} className="flex flex-wrap items-center gap-x-2.5">
          <span className="text-code-dim">{file}</span>
          <span className="text-code-comment">→</span>
          <span className="text-code-key">{method}</span>
          <span className="text-code-plain">{url}</span>
        </p>
      ))}
    </div>
  )
}

export function RedisVisual() {
  return (
    <div className="forge rounded-lg border border-line bg-canvas p-4 font-mono text-2xs">
      <p>
        <span className="text-code-key">REDIS_URL</span>
        <span className="text-code-dim">=</span>
        <span className="text-code-str">redis://localhost:6379</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {['cache', 'queues', 'locks', 'sessions', 'rate limits'].map((chip) => (
          <span key={chip} className="rounded border border-line bg-surface px-2 py-0.5 text-code-plain">
            {chip}
          </span>
        ))}
      </div>
    </div>
  )
}

export function CliVisual() {
  return (
    <div className="forge rounded-lg border border-line bg-canvas p-4 font-mono text-xs leading-loose">
      <p>
        <span className="text-code-key">$</span>
        <span className="text-code-plain"> damat </span>
        <span className="text-code-dim">dev · build · codegen · module add</span>
      </p>
      <p className="mt-1 flex items-center gap-2">
        <SparklesIcon width={13} height={13} className="text-code-key" />
        <span className="text-code-comment">or let your agent drive it over MCP</span>
      </p>
    </div>
  )
}
