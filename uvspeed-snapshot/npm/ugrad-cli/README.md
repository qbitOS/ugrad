# ugrad-cli

`ugrad games` in **Terminal.app / zsh** fails with `command not found` because **`ugrad` is a HexTerm (browser) command**, not a POSIX binary.

This package opens the static PWA from your uvspeed checkout:

```bash
cd /path/to/uvspeed
npx ugrad-cli open      # HexTerm — then type: ugrad games
npx ugrad-cli raw       # raw-games-ugrad.html (corpus index)
npx ugrad-cli hub
npx ugrad-cli alphabet  # digital_alphabet.html
```

Set `UVSPEED_ROOT` if the repo is not discoverable from `cwd`.

Published site: `https://qbitos.github.io/uvspeed/web/terminal.html`
