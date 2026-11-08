/**
 * ET-LOG · Gate capacity, transport seats and route occupancy.
 *
 * THE GATE IS THE CONSTRAINT NOBODY MODELS. A compound with two hundred
 * deliveries booked over a week has a gate that processes a vehicle in a
 * known number of minutes, and a booking system that accepts bookings
 * irrespective of it. The deliveries all arrive, the gate queues onto the
 * public highway, and the finding is a letter from the highway authority.
 *
 * SO THREE ARITHMETICS. Bookings against gate throughput per window, because
 * a window with more vehicles than it can process is overbooked by a number.
 * Seats against the shift that needs them, by stop, because a bus with
 * capacity in total and none at the stop where forty people wait has no
 * capacity. And a protected fallback, because a cancelled vehicle on a remote
 * site is not an inconvenience — it is people who cannot leave, and the
 * specification requires transport capacity to be protected for cancellations
 * using an approved fallback.
 */

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

export function check({ gates = [], bookings = [], transport = [], shifts = [], fallback = null } = {}) {
  const gateRows = (Array.isArray(gates) ? gates : []).filter(Boolean);
  const bookingRows = (Array.isArray(bookings) ? bookings : []).filter(Boolean);

  // Gate throughput per window.
  const overbooked = [];
  for (const g of gateRows) {
    const id = String(g.id ?? "(unidentified gate)");
    const minutes = num(g.windowMinutes);
    const perVehicle = num(g.minutesPerVehicle);
    if (minutes === null || perVehicle === null || perVehicle <= 0) {
      overbooked.push({ gate: id, why: "no window length or no minutes per vehicle, so throughput is not a number" });
      continue;
    }
    const capacity = Math.floor(minutes / perVehicle);
    const booked = bookingRows.filter((b) => String(b.gate) === id && String(b.window ?? "") === String(g.window ?? "")).length;
    if (booked > capacity) {
      overbooked.push({ gate: id, window: String(g.window ?? ""), capacity, booked, excess: booked - capacity,
        why: `${booked} vehicles booked against a throughput of ${capacity} in ${minutes} minutes — ${booked - capacity} queue onto the highway` });
    }
  }

  // Seats by stop against the shift that needs them.
  const seatShortfalls = [];
  for (const s of (Array.isArray(shifts) ? shifts : []).filter(Boolean)) {
    const stop = String(s.stop ?? "(unnamed stop)");
    const need = num(s.people);
    if (need === null) { seatShortfalls.push({ stop, why: "no headcount for the stop" }); continue; }
    const seats = (Array.isArray(transport) ? transport : [])
      .filter(Boolean)
      .filter((t) => String(t.stop ?? "") === stop && String(t.shift ?? "") === String(s.shift ?? ""))
      .reduce((tot, t) => tot + (num(t.seats) ?? 0), 0);
    if (seats < need) {
      seatShortfalls.push({ stop, shift: String(s.shift ?? ""), need, seats, shortfall: need - seats,
        why: `${need} people at ${stop} against ${seats} seat(s) — a vehicle with capacity in total and none at this stop has no capacity here` });
    }
  }

  const fallbackMissing = fallback === null || fallback === "" || fallback === false
    ? [{ why: "no approved fallback for a cancelled vehicle — on a remote site that is not an inconvenience, it is people who cannot leave" }]
    : [];

  const faults = overbooked.length + seatShortfalls.length + fallbackMissing.length;
  return {
    ok: faults === 0,
    gates: gateRows.length, bookings: bookingRows.length,
    overbooked, seatShortfalls, fallbackMissing,
    faults,
    say: faults === 0
      ? `${gateRows.length} gate window(s) within throughput, every stop seated, and an approved fallback recorded`
      : `${faults} fault(s) — ${overbooked.length} overbooked gate window(s), ${seatShortfalls.length} seat shortfall(s)`,
  };
}
