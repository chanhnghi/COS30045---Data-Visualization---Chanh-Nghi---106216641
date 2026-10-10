// Explore the temporary TV registration snapshot using plain SVG and DOM APIs.

const snapshot = window.TV_SNAPSHOT;
const statusMessage = document.getElementById('load-message');
const content = document.getElementById('data-content');
const technologyFilter = document.getElementById('technology-filter');
const brandFilter = document.getElementById('brand-filter');
const sizeFilter = document.getElementById('size-filter');
const chart = document.getElementById('tv-chart');
const tableBody = document.getElementById('model-table');
const svgNS = 'http://www.w3.org/2000/svg';
const whole = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 1 });

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function svg(tag, attributes = {}, text = '') {
  const element = document.createElementNS(svgNS, tag);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  if (text) element.textContent = text;
  return element;
}

function updateStats(models) {
  document.getElementById('model-count').textContent = whole.format(models.length);
  const energy = median(models.map((model) => model.annualKwh));
  const size = median(models.map((model) => model.screenInches));
  const stars = median(models.map((model) => model.stars).filter(Number.isFinite));
  document.getElementById('median-energy').textContent = energy === null ? '—' : whole.format(energy);
  document.getElementById('median-size').textContent = size === null ? '—' : oneDecimal.format(size);
  document.getElementById('median-stars').textContent = stars === null ? '—' : oneDecimal.format(stars);
}

function drawChart(models) {
  while (chart.children.length > 2) chart.lastChild.remove();
  const left = 75;
  const right = 865;
  const top = 25;
  const bottom = 390;
  const x = (inches) => left + ((inches - 10) / 110) * (right - left);
  const y = (kwh) => bottom - (kwh / 3000) * (bottom - top);

  for (let kwh = 0; kwh <= 3000; kwh += 500) {
    const vertical = y(kwh);
    chart.append(svg('line', { x1: left, y1: vertical, x2: right, y2: vertical, class: 'grid-line' }));
    chart.append(svg('text', { x: left - 12, y: vertical + 4, 'text-anchor': 'end', class: 'tick-label' }, whole.format(kwh)));
  }
  for (let inches = 20; inches <= 120; inches += 20) {
    const horizontal = x(inches);
    chart.append(svg('line', { x1: horizontal, y1: top, x2: horizontal, y2: bottom, class: 'grid-line' }));
    chart.append(svg('text', { x: horizontal, y: bottom + 23, 'text-anchor': 'middle', class: 'tick-label' }, String(inches)));
  }
  chart.append(svg('line', { x1: left, y1: bottom, x2: right, y2: bottom, class: 'axis-line' }));
  chart.append(svg('line', { x1: left, y1: top, x2: left, y2: bottom, class: 'axis-line' }));
  chart.append(svg('text', { x: 19, y: 220, transform: 'rotate(-90 19 220)', 'text-anchor': 'middle', class: 'axis-title' }, 'LABELLED ANNUAL ENERGY / KWH'));

  const dots = svg('g');
  models.forEach((model) => {
    const dot = svg('circle', {
      cx: x(model.screenInches), cy: y(model.annualKwh), r: models.length > 1000 ? 2.5 : 3.5,
      class: 'plot-point'
    });
    dot.append(svg('title', {}, `${model.brand} ${model.model}: ${model.screenInches} in, ${model.annualKwh} kWh/year`));
    dots.append(dot);
  });
  chart.append(dots);
  document.getElementById('chart-note').textContent = `${whole.format(models.length)} records plotted. Both axes retain the same scale as filters change (10–120 inches; 0–3,000 kWh/year). Hover a dot for its model details.`;
}

function updateTable(models) {
  tableBody.replaceChildren();
  const lowest = [...models].sort((a, b) => a.annualKwh - b.annualKwh).slice(0, 10);
  if (!lowest.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'No models match these filters. Try a wider selection.';
    row.append(cell);
    tableBody.append(row);
    return;
  }
  lowest.forEach((model) => {
    const row = document.createElement('tr');
    const brand = document.createElement('td');
    brand.textContent = model.brand;
    const modelName = document.createElement('span');
    modelName.textContent = model.model || 'Model not recorded';
    brand.append(modelName);
    const size = document.createElement('td');
    size.textContent = `${oneDecimal.format(model.screenInches)} in`;
    const technology = document.createElement('td');
    technology.textContent = model.technology;
    const energy = document.createElement('td');
    energy.textContent = `${whole.format(model.annualKwh)} kWh/y`;
    const stars = document.createElement('td');
    stars.textContent = Number.isFinite(model.stars) ? oneDecimal.format(model.stars) : '—';
    row.append(brand, size, technology, energy, stars);
    tableBody.append(row);
  });
}

function updateView() {
  const technology = technologyFilter.value;
  const brand = brandFilter.value;
  const sizeBand = sizeFilter.value;
  const models = snapshot.models.filter((model) => {
    if (technology !== 'all' && model.technology !== technology) return false;
    if (brand !== 'all' && model.brand !== brand) return false;
    if (sizeBand === 'under50' && model.screenInches >= 50) return false;
    if (sizeBand === '50to69' && (model.screenInches < 50 || model.screenInches >= 70)) return false;
    if (sizeBand === '70plus' && model.screenInches < 70) return false;
    return true;
  });
  updateStats(models);
  drawChart(models);
  updateTable(models);
}

if (!snapshot || !Array.isArray(snapshot.models)) {
  statusMessage.textContent = 'The TV data file could not be loaded. Check assets/data/tv-snapshot.js.';
} else {
  const brands = [...new Set(snapshot.models.map((model) => model.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  brands.forEach((brand) => {
    const option = document.createElement('option');
    option.value = brand;
    option.textContent = brand;
    brandFilter.append(option);
  });
  [technologyFilter, brandFilter, sizeFilter].forEach((filter) => filter.addEventListener('change', updateView));
  statusMessage.hidden = true;
  content.hidden = false;
  updateView();
}
