import indiaMap from '@svg-maps/india';
import { svgPathBbox } from 'svg-path-bbox';
import fs from 'fs';

const nameOverride = {
  'JAMMU AND KASHMIR': 'Jammu and Kashmir',
  'LADAKH': 'Jammu and Kashmir',
  'THE DADRA AND NAGAR HAVELI AND DAMAN AND DIU': 'Dadra and Nagar Haveli',
};

const byName = {};
for (const loc of indiaMap.locations) {
  byName[loc.name.toUpperCase()] = loc;
}

const statesCsv = fs.readFileSync('/private/tmp/claude-501/-Users-mugdhaarora-projects-school-thik-karo/a104e4e9-c61e-4f36-8043-4d3c71f1ebb2/scratchpad/states_clean.csv', 'utf8')
  .split('\n').slice(1).filter(Boolean);

const result = {};
for (const line of statesCsv) {
  const [code, ...rest] = line.split(',');
  const name = rest.join(',').trim();
  const svgName = nameOverride[name] || name.replace(/^THE /, '');
  const loc = byName[svgName.toUpperCase()] || byName[name.toUpperCase()];
  if (!loc) {
    console.error('NO MATCH', name);
    continue;
  }
  const [minX, minY, maxX, maxY] = svgPathBbox(loc.path);
  result[code] = { svgId: loc.id, svgName: loc.name, bbox: [minX, minY, maxX, maxY] };
}
fs.writeFileSync('data/state-map.json', JSON.stringify(result, null, 2));
console.log('done', Object.keys(result).length);
