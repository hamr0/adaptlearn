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
(v1, locked). Status: **pre-build** — module ladder M0–M6 defined, nothing built yet.

Apache-2.0.
