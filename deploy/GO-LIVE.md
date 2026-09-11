# Getting the current build live — Hostinger VPS

This repository deploys to a VPS by cron, not to a platform host. There is a
`render.yaml` in the root as an alternative route; **it is not what you use**
and nothing below touches it.

---

## First: is auto-deploy still running, and why did it stop?

`deploy/autodeploy.sh` runs from cron every five minutes, pulls this branch,
builds a Docker image, starts it on a spare name, health-checks it, and only
swaps the live container if it answers. That last part is the important one.

**Between 10 September and 11 September, that health check could not pass.**
The Dockerfile copied `backend`, `frontend` and `shared` but not `content/`,
and `backend/lib/blog.js` reads `content/blog` as it loads. So every build
since produced an image whose container died on startup before binding a
port. `deploy.sh` did exactly what it was written to do:

    REFUSING TO DEPLOY: the new build did not report healthy on <sha>.
    The live container has not been touched.

It has been saying that every five minutes, and it has been right to. The
live site stayed on the last image that worked. **The fix is commit
`880ded7`, already pushed.**

---

## On the VPS, in order

SSH in, then:

### 1. Is the cron entry even there?

    cat /etc/cron.d/etablix-autodeploy

Expect a line calling `/opt/etablix/deploy/autodeploy.sh`. If the file does
not exist, auto-deploy was never installed and nothing has ever deployed by
itself. Install it:

    echo '*/5 * * * * root flock -n /run/etablix-deploy.lock /opt/etablix/deploy/autodeploy.sh' > /etc/cron.d/etablix-autodeploy

### 2. What does it say about itself?

    /opt/etablix/deploy/autodeploy.sh --status

### 3. Read the deploy log — the refusals will be in it

    tail -50 /var/log/etablix-deploy.log
    grep -c "REFUSING TO DEPLOY" /var/log/etablix-deploy.log

A large count there confirms the diagnosis above.

### 4. Is it paused?

    ls -la /var/lib/etablix/pause-deploy

If that file exists, every tick has exited immediately. Remove it:

    rm /var/lib/etablix/pause-deploy

### 5. Deploy the current commit by hand, now

Do not wait for the next tick:

    cd /opt/etablix
    git fetch origin claude/construction-marketing-website-ndn7cx
    ./deploy/deploy.sh

Watch it. You want `candidate <sha> healthy — switching`, not `REFUSING`.

### 6. Confirm what is actually serving

    curl -s https://etablix.com/api/health

The `build` value should read `626096032c8d`. If it reads anything else, the
swap did not happen and step 5's output says why.

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
