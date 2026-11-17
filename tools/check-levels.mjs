import { getLevel, LEVEL_COUNT } from '../js/levels.js';
import { isSolved } from '../js/engine.js';
let bad = 0;
for (let i = 0; i < LEVEL_COUNT; i++) {
  const t = Date.now();
  const L = getLevel(i);
  const solved = L && isSolved(L, L.secret);
  let solvers = 0;
  for (let a = 0; a < 360; a += 0.5) if (isSolved(L, a)) solvers++;
  console.log(`#${i + 1} dots=${L.dots.length} obst=${L.obstacles.length} maxB=${L.maxBounces} width=${L.width.toFixed(1)}deg ok=${solved} solvingAngles(0.5deg steps)=${solvers} ${Date.now() - t}ms`);
  if (!solved) bad++;
}
console.log(bad ? 'FAIL' : 'ALL SOLVABLE');
process.exit(bad ? 1 : 0);
