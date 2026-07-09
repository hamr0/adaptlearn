# adaptlearn

An experiment: can an agent's **harness** — not its plan, not its code — be an emergent,
adapting artifact that improves across runs?

Assembled from the bare suite (`bareagent`, `litectx`, `bareguard`); builds no primitives.
A deliberately dumb outer loop holds the grounded close and the budget; the agent authors its
own workflow as a constrained config, revises it mid-run when the close fails, and inherits
what *worked* (verdict-gated) across runs. The agent never authors its arbiter.

Sibling of [relayfact](https://github.com/hamr0/relayfact), which settled the grounded-loop
question this experiment stands on. Like relayfact, adaptlearn either **graduates or gets
archived** — the bar is the point.

The governing spec: [docs/01-product/adaptlearn-prd.md](docs/01-product/adaptlearn-prd.md)
(v1, locked). Status: **M3 passed** — shell+spine (M0), schema+validator (M1), interpreter
(M2), and the contrast kill-switch (M3: opposed hand-configs differ categorically — verdict,
green@1 vs cap-halt@4 — so the schema's variables are provably wired in) are done. Next: M4,
agent authorship behind a parity gate.

Apache-2.0.
