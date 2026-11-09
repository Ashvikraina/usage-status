# usage-status

A Claude Code mod that ends each of Claude's replies with a small line showing how much of your
**5-hour session limit** and **weekly limit** you've used, and when each one resets:

*⏱ 5-hour 11%, resets in 40m · Weekly 1%, resets in 6d 22h*

The numbers come from Claude Code itself, not from the model, so they cost nothing to fetch. The
line becomes part of the reply, so later turns carry it (about 25 tokens each), and a one-sentence
system-prompt note stops Claude from ever writing the line itself. It only shows figures on a
Claude subscription (API-key sessions have no such limits). It works in the terminal, the desktop
app and cloud sessions alike.

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
