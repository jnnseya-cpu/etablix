# Getting the current build live — Hostinger VPS

This repository deploys to a VPS by cron, not to a platform host. There is a
`render.yaml` in the root as an alternative route; **it is not what you use**
and nothing below touches it.

---

## The two reasons live never updated

Both found on the box, both confirmed from a traced run of `deploy.sh`.

### 1. The deploy short-circuits on the wrong reference

`deploy.sh` compared the git working copy against origin and exited when they
matched. But step 1 does `git reset --hard` to the target **before** the
build. So any run that got that far and then stopped, or anybody running
`git pull` here by hand, leaves the checkout on the new commit and the
container on the old one.

From that moment the check is permanently true. Every five-minute tick exits
immediately having done nothing, and never warns, because from its own point
of view there is nothing to do. Your checkout was on `454ea5a`; the container
was serving `a863a720d69f` from 10 September, 36 commits behind.

**Fixed in the repository.** The check now reads the running container's
build from `/api/health` and compares that, which is what `autodeploy.sh` has
always said it does.

### 2. Auto-deploy is pointed at staging

`/etc/default/etablix` contains:

    ETABLIX_AUTODEPLOY_TARGET=staging

So every tick that did run went to staging. Live was never a target. To send
it to live:

    sed -i '/^ETABLIX_AUTODEPLOY_TARGET=/d' /etc/default/etablix
    /opt/etablix/deploy/autodeploy.sh --status

---

## Get live now, in order

    cd /opt/etablix
    git pull                                      # picks up the deploy.sh fix
    FORCE=1 ./deploy/deploy.sh                    # bypasses the wedge once

Watch for `candidate <sha> healthy — switching`. Then:

    curl -s https://etablix.com/api/health

The `build` value should no longer be `a863a720d69f`.

`FORCE=1` is only needed for this first run. Once the container is current,
the fixed check keeps it that way on its own.

If instead you see `REFUSING TO DEPLOY: the new build did not report healthy`,
the image built but its container would not answer. That is the deploy safety
working: your live site has not been touched. Skip to the section below.

Then decide about staging:

    sed -i '/^ETABLIX_AUTODEPLOY_TARGET=/d' /etc/default/etablix

---

## If the deploy still refuses

Run the build by hand and read the container's first lines. That is where the
real error is, and it is usually one sentence:

    cd /opt/etablix
    docker build -t etablix:test .
    docker run --rm --env-file /opt/etablix/etablix.env etablix:test

Two things it may now tell you, both deliberate and both with the fix in the
message:

- `[preflight] REFUSING TO START` — an environment variable is missing. Each
  line names which and how to set it. Check `/opt/etablix/etablix.env` has
  `ETABLIX_ADMIN_EMAIL`, `ETABLIX_ADMIN_PASSWORD` (12 characters or more) and
  `ETABLIX_TOKEN_SECRET`.
- A Node version error — the image pins Node 22 and the store needs it. If
  you are running the app outside Docker, `node -v` must be 22 or later.

---

## Rolling back

    /opt/etablix/deploy/rollback.sh

The previous image is kept and recorded on every successful deploy.

---

## Once it is live

- `curl -s https://etablix.com/api/health` returns `{"ok":true,...}`
- `/internal/login.html` signs in with the credentials in `etablix.env`
- Team → Platform connections: paste the Anthropic key, or the agents stay
  catalogued and unrunnable
- `contact@etablix.com` receives mail. The site publishes that address on
  every page, and a bounce is worse than no website

`deploy/RUNBOOK.md` is the operations and recovery document. Every entry in it
is a command rather than a description.
