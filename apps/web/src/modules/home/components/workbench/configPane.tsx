/** Hand-set damat.config.ts pane; the `user` module line heats up as the
 *  terminal "registers" it. Delay lives on `.heat` in globals.css. */
export function ConfigPane() {
  const ln = 'block px-5'
  return (
    <pre className="overflow-x-auto py-5 font-mono text-code">
      <code>
        <span className={ln}>
          <span className="text-code-key">import</span>
          <span className="text-code-plain"> {'{ defineConfig }'} </span>
          <span className="text-code-key">from</span>
          <span className="text-code-str"> &quot;@damatjs/framework&quot;</span>
          <span className="text-code-dim">;</span>
        </span>
        <span className={ln}>&nbsp;</span>
        <span className={ln}>
          <span className="text-code-key">export default</span>
          <span className="text-code-plain"> defineConfig({'{'}</span>
        </span>
        <span className={ln}>
          <span className="text-code-plain">{'  '}projectConfig: {'{'}</span>
        </span>
        <span className={ln}>
          <span className="text-code-plain">{'    '}databaseUrl: process.env.</span>
          <span className="text-code-key">DATABASE_URL</span>
          <span className="text-code-dim">!,</span>
        </span>
        <span className={ln}>
          <span className="text-code-plain">{'    '}redisUrl: process.env.</span>
          <span className="text-code-key">REDIS_URL</span>
          <span className="text-code-dim">,</span>
        </span>
        <span className={ln}>
          <span className="text-code-plain">{'    '}http: {'{ port: 6543 }'}</span>
          <span className="text-code-dim">,</span>
        </span>
        <span className={ln}>
          <span className="text-code-plain">{'  }'}</span>
          <span className="text-code-dim">,</span>
        </span>
        <span className={ln}>
          <span className="text-code-plain">{'  '}modules: {'{'}</span>
        </span>
        <span className={`${ln} heat`}>
          <span className="text-code-plain">
            {'    '}user: {'{'} resolve:{' '}
            <span className="text-code-str">&quot;./src/modules/user&quot;</span>, id:{' '}
            <span className="text-code-str">&quot;user&quot;</span> {'}'}
          </span>
          <span className="text-code-dim">,</span>
          <span className="text-code-comment"> {'// ← added'}</span>
        </span>
        <span className={ln}>
          <span className="text-code-plain">{'  }'}</span>
          <span className="text-code-dim">,</span>
        </span>
        <span className={ln}>
          <span className="text-code-plain">{'}'});</span>
        </span>
      </code>
    </pre>
  )
}
