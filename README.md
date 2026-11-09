# usage-status

A Claude Code mod that keeps a small status line under the prompt showing how much of your
**5-hour session limit** and **weekly limit** you've used, plus when each one resets:

```
5h 23% ↻1h12m · wk 41% ↻3d4h
```

The percentages update after each reply from Claude, and the countdowns refresh every minute.
It shows figures only on a Claude subscription (API-key sessions have no such limits), and
only after the first reply of a session, since that's when Claude Code learns your usage.

## Install

At the prompt of a terminal session:

```
/plugin install usage-status --marketplace Ashvikraina/usage-status
```

From a shell:

```bash
claude plugin install usage-status --marketplace Ashvikraina/usage-status
```

Answer `y` to add the marketplace, then pick the **user** scope so it loads in every session.

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins,
Add marketplace with `Ashvikraina/usage-status`, then Add plugin.
