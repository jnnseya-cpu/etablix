/**
 * Language-model adapters.
 *
 * The provider changes, and more to the point a run has to be reproducible
 * against the one that was actually used. The port keeps the core from
 * knowing which SDK is underneath; the fingerprint in routing.js keeps the
 * record of which one answered.
 *
 * PROMPT CONSTRUCTION IS NOT AN ADAPTER CONCERN. What to ask, in what order,
 * against which working paper, is the pipeline's business. An adapter that
 * started assembling prompts would be deciding what the answer is about.
 */

/** The real one, wrapping whatever client the application holds. */
export function providerLlm(client, { model = null, provider = "anthropic" } = {}) {
  return {
    name: provider,
    provider() { return provider; },
    async complete(request) {
      const r = request || {};
      if (!r.prompt && !r.messages) return { text: "", model: null, usage: null, reason: "no prompt" };
      const res = await client(r);
      return {
        text: String((res && res.text) || ""),
        model: (res && res.model) || model,
        usage: (res && res.usage) || null,
      };
    },
  };
}

/** A model that returns what it was told to, so the port can be compared. */
export function scriptedLlm(answers = {}, { provider = "scripted" } = {}) {
  return {
    name: provider,
    provider() { return provider; },
    async complete(request) {
      const r = request || {};
      if (!r.prompt && !r.messages) return { text: "", model: null, usage: null, reason: "no prompt" };
      const key = String(r.prompt || "");
      const text = Object.entries(answers).find(([k]) => key.includes(k));
      return {
        text: text ? text[1] : "",
        model: provider,
        usage: { input: key.length, output: text ? text[1].length : 0, cacheRead: 0, cacheWrite: 0 },
      };
    },
  };
}
