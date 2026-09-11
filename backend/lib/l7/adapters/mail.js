/**
 * Outbound-mail adapters.
 *
 * Nothing in the core should know whether a message left by SMTP, an API or a
 * queue. What the core does need is a consistent answer to "did it go", and
 * consistent refusals — a message with no recipient must be refused the same
 * way by both, because a core that treats one adapter's silent success as
 * delivery will do it to the other as well.
 *
 * DECIDING WHETHER TO SEND IS NOT A MAIL CONCERN. No template selection, no
 * recipient policy, no judgement about whether something is overdue. Those
 * live in the domain, and an adapter that acquired them would be the exact
 * rot the no-business-logic check exists to catch.
 */

/** The real one, through this application's transport. */
export function transportMail(send, verify) {
  return {
    name: "transport",
    async send(message) {
      const m = message || {};
      if (!m.to) return { ok: false, reason: "no recipient" };
      if (!m.subject) return { ok: false, reason: "no subject" };
      try {
        const r = await send(m);
        return { ok: true, id: String((r && (r.messageId || r.id)) || "sent") };
      } catch (err) {
        return { ok: false, reason: String(err.message).slice(0, 200) };
      }
    },
    async verify() {
      try {
        const r = verify ? await verify() : { ok: true };
        return { ok: r.ok !== false, reason: r.reason || null };
      } catch (err) {
        return { ok: false, reason: String(err.message).slice(0, 200) };
      }
    },
  };
}

/** A mailbox in memory, refusing exactly what the real one refuses. */
export function memoryMail() {
  const sent = [];
  let n = 0;
  return {
    name: "memory",
    async send(message) {
      const m = message || {};
      if (!m.to) return { ok: false, reason: "no recipient" };
      if (!m.subject) return { ok: false, reason: "no subject" };
      const id = `mem-${++n}`;
      sent.push({ ...m, id });
      return { ok: true, id };
    },
    async verify() { return { ok: true, reason: null }; },
    // Beyond the contract, for a test that wants to read the mailbox.
    outbox() { return sent.slice(); },
  };
}
