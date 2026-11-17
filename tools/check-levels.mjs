import { LEVELS } from '../js/levels-data.js';
import { DAILY } from '../js/daily-data.js';
import { isSolved, simulate } from '../js/engine.js';
let bad = 0;
for (const [name, set] of [['levels', LEVELS], ['daily', DAILY]]) {
  let trivial = 0;
  set.forEach((L, i) => {
    const ok = isSolved(L, L.secret);
    if (isSolved(L, 90)) trivial++;
    if (!ok) { bad++; console.log('FAIL', name, i + 1); }
    if (L.portals.length && !simulate(L, L.secret, L.maxBounces).some((p) => p.jump)) { bad++; console.log('portal unused', name, i + 1); }
  });
  console.log(name, set.length, 'checked; solved by default aim (90°):', trivial);
}
console.log(bad ? 'FAIL ' + bad : 'ALL OK');
process.exit(bad ? 1 : 0);
