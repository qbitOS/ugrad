# GitHub — push / sync

**Remote:** `origin` → [qbitOS/ugrad](https://github.com/qbitOS/ugrad)

## First-time setup

```bash
cd /Volumes/qbitOS/00.dev/ugrad
git init
git branch -M main
git remote add origin https://github.com/qbitOS/ugrad.git
git add -A
git commit -m "chore: org umbrella — compliance, Community Standards, upstream"
git push -u origin main
```

If **`origin` already exists**, verify:

```bash
git remote -v
```

## Push (after local commits)

```bash
cd /Volumes/qbitOS/00.dev/ugrad
git status
git push origin main
```

If the remote has diverged, pull with rebase first:

```bash
git pull --rebase origin main
# resolve conflicts
git push origin main
```

## Sync from another machine

Copy edits from `~/dev/projects/ugrad` or edit here; keep **UPSTREAM.md** accurate if you add automation.
