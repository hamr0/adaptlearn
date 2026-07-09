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
(v1, locked). Status: **M5 passed** — M0 shell+spine, M1 schema+validator, M2 interpreter, M3
contrast (kill-switch did not fire; memory-surfacing proven causal by intervention), M4 agent
authorship (parity met; found validator gap F9), M5 mid-run revision (recovery 3/3 vs control
1/3, falsifier 0/2). Next: M6 — inheritance + selection, the claim itself.

Apache-2.0.
