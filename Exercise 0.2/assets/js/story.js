// Interactive views of the processed October 2026 TV model snapshot.
(() => {
  const snapshot = window.TV_SNAPSHOT;
  const lineChart = document.getElementById('viewing-chart');
  if (!lineChart) return;

  const hours = [2, 4, 6, 8, 10];
  const svgNS = 'http://www.w3.org/2000/svg';
  const whole = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 0 });
  const one = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 1 });
  const two = new Intl.NumberFormat('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const lineColors = ['#edaa31', '#57a8ac', '#e57f78', '#b7a471'];
  const barColors = { on: '#c47b20', passive: '#6b8990', active: '#a14d55' };
  const models = Array.isArray(snapshot?.models) ? snapshot.models : [];
  const byId = new Map(models.map(model => [model.id, model]));

  const tooltip = document.createElement('div');
  tooltip.id = 'story-tooltip';
  tooltip.className = 'story-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  document.body.append(tooltip);

  function hideTooltip() {
    tooltip.hidden = true;
  }

  function positionTooltip(x, y) {
    const gap = 16;
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const left = x + width + gap > window.innerWidth ? x - width - gap : x + gap;
    const top = y + height + gap > window.innerHeight ? y - height - gap : y + gap;
    tooltip.style.left = `${Math.max(8, Math.min(left, window.innerWidth - width - 8))}px`;
    tooltip.style.top = `${Math.max(8, Math.min(top, window.innerHeight - height - 8))}px`;
  }

  function showTooltip(data, x, y) {
    tooltip.replaceChildren();
    const eyebrow = document.createElement('span');
    eyebrow.className = 'story-tooltip-eyebrow';
    eyebrow.textContent = data.eyebrow;
    const heading = document.createElement('strong');
    heading.className = 'story-tooltip-heading';
    heading.textContent = data.heading;
    const value = document.createElement('div');
    value.className = 'story-tooltip-value';
    value.textContent = data.value;
    const details = document.createElement('dl');
    data.rows.forEach(([label, content]) => {
      const term = document.createElement('dt');
      term.textContent = label;
      const description = document.createElement('dd');
      description.textContent = content;
      details.append(term, description);
    });
    tooltip.append(eyebrow, heading, value, details);
    tooltip.hidden = false;
    positionTooltip(x, y);
  }

  function attachTooltip(target, data) {
    target.classList.add('story-tooltip-target');
    target.setAttribute('tabindex', '0');
    target.setAttribute('aria-label', `${data.heading}. ${data.eyebrow}. ${data.value}`);
    target.setAttribute('aria-describedby', tooltip.id);
    target.addEventListener('pointerenter', event => showTooltip(data, event.clientX, event.clientY));
    target.addEventListener('pointermove', event => {
      if (!tooltip.hidden) positionTooltip(event.clientX, event.clientY);
    });
    target.addEventListener('pointerleave', hideTooltip);
    target.addEventListener('focus', () => {
      const box = target.getBoundingClientRect();
      showTooltip(data, box.left + box.width / 2, box.top + box.height / 2);
    });
    target.addEventListener('blur', hideTooltip);
    target.addEventListener('click', event => showTooltip(data, event.clientX, event.clientY));
  }

  window.addEventListener('scroll', hideTooltip, { passive: true });
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('.story-tooltip-target')) hideTooltip();
  });

  function svg(tag, attributes = {}, text = '') {
    const node = document.createElementNS(svgNS, tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    if (text !== '') node.textContent = text;
    return node;
  }

  function clearPlot(node) {
    while (node.children.length > 2) node.lastChild.remove();
  }

  function median(values) {
    if (!values.length) return null;
    const ordered = [...values].sort((a, b) => a - b);
    const mid = Math.floor(ordered.length / 2);
    return ordered.length % 2 ? ordered[mid] : (ordered[mid - 1] + ordered[mid]) / 2;
  }

  function niceTop(value) {
    if (!Number.isFinite(value) || value <= 0) return 1;
    const magnitude = 10 ** Math.floor(Math.log10(value / 4));
    const raw = value / 4 / magnitude;
    const step = [1, 2, 2.5, 5, 10].find(candidate => candidate >= raw) * magnitude;
    return Math.ceil(value / step) * step;
  }

  function plotFrame(node, height, upper, yCaption, xCaption, bottomPad = 75) {
    clearPlot(node);
    const left = 86, right = 945, top = 55, bottom = height - bottomPad;
    const y = value => bottom - (value / upper) * (bottom - top);
    const step = upper / 5;
    for (let i = 0; i <= 5; i++) {
      const value = i * step;
      const yy = y(value);
      node.append(svg('line', { x1: left, y1: yy, x2: right, y2: yy, class: 'story-grid-line' }));
      node.append(svg('text', { x: left - 14, y: yy + 5, 'text-anchor': 'end', class: 'story-tick' },
        upper <= 10 ? one.format(value) : whole.format(value)));
    }
    node.append(svg('line', { x1: left, y1: bottom, x2: right, y2: bottom, class: 'story-axis-line' }));
    node.append(svg('text', { x: left, y: 30, class: 'story-axis-caption' }, yCaption));
    node.append(svg('text', { x: (left + right) / 2, y: height - 18, 'text-anchor': 'middle', class: 'story-axis-caption' }, xCaption));
    return { left, right, top, bottom, y };
  }

  function sizeGroup(model) {
    return model.screenInches <= 43 ? 'Small' : model.screenInches <= 66 ? 'Medium' : 'Large';
  }

  function technologyOptions(select) {
    const technologies = [...new Set(models.map(model => model.technology))].sort();
    technologies.forEach(technology => {
      const option = document.createElement('option');
      option.value = technology;
      option.textContent = technology;
      select.append(option);
    });
  }

  // Angle 1: the browser filters model rows and highlights up to four lines.
  const lineTech = document.getElementById('line-tech');
  const lineSize = document.getElementById('line-size');
  const modelSearch = document.getElementById('model-search');
  const modelResults = document.getElementById('model-results');
  const selectedWrap = document.getElementById('selected-models');
  const selectionCount = document.getElementById('selection-count');
  const lineLegend = document.getElementById('line-legend');
  const lineNote = document.getElementById('line-note');
  technologyOptions(lineTech);

  function representative(size, technology, watts, excluded) {
    return models.filter(model => model.technology === technology && !excluded.includes(model.id))
      .sort((a, b) =>
        (Math.abs(a.screenInches - size) * 12 + Math.abs(a.onW - watts) / 10) -
        (Math.abs(b.screenInches - size) * 12 + Math.abs(b.onW - watts) / 10))[0];
  }

  let selectedIds = [];
  [[32, 'LCD (LED)', 60], [55, 'OLED', 120], [65, 'LCD (LED)', 150], [75, 'LCD (LED)', 210]]
    .forEach(([size, technology, watts]) => {
      const model = representative(size, technology, watts, selectedIds);
      if (model) selectedIds.push(model.id);
    });

  function matchingLineModels() {
    return models.filter(model =>
      (lineTech.value === 'all' || model.technology === lineTech.value) &&
      (lineSize.value === 'all' || sizeGroup(model) === lineSize.value));
  }

  function modelLabel(model) {
    return `${model.brand} ${model.model}`;
  }

  function renderSelected() {
    selectedWrap.replaceChildren();
    lineLegend.replaceChildren();
    selectionCount.textContent = `${selectedIds.length}/4`;
    if (!selectedIds.length) {
      const hint = document.createElement('span');
      hint.className = 'selection-hint';
      hint.textContent = 'Search above to add a model.';
      selectedWrap.append(hint);
    }
    selectedIds.forEach((id, index) => {
      const model = byId.get(id);
      const chip = document.createElement('div');
      chip.className = 'model-chip';
      chip.style.setProperty('--model-color', lineColors[index]);
      const label = document.createElement('span');
      label.textContent = `${modelLabel(model)} · ${one.format(model.screenInches)} in`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Remove ${modelLabel(model)}`);
      remove.addEventListener('click', () => {
        selectedIds = selectedIds.filter(selected => selected !== id);
        renderLineSection();
      });
      chip.append(label, remove);
      selectedWrap.append(chip);

      const key = document.createElement('div');
      key.className = 'line-legend-item';
      const swatch = document.createElement('i');
      swatch.style.background = lineColors[index];
      const text = document.createElement('span');
      text.textContent = `${modelLabel(model)} · ${one.format(model.scenarioKwh[1])} kWh at 4 h/day`;
      key.append(swatch, text);
      lineLegend.append(key);
    });
  }

  function hash(value) {
    let result = 2166136261;
    for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
    return result >>> 0;
  }

  function renderLineChart(matching) {
    hideTooltip();
    const selected = selectedIds.map(id => byId.get(id)).filter(Boolean);
    const remaining = matching.filter(model => !selectedIds.includes(model.id));
    const ranked = [...remaining].sort((a, b) => a.scenarioKwh[4] - b.scenarioKwh[4]);
    const contextPool = ranked.slice(0, Math.max(1, Math.ceil(ranked.length * .98)));
    const background = contextPool.sort((a, b) => hash(a.id) - hash(b.id)).slice(0, 300);
    const topValue = Math.max(1, ...selected.concat(background).map(model => Math.max(...model.scenarioKwh)));
    const upper = niceTop(topValue * 1.06);
    const frame = plotFrame(lineChart, 490, upper, 'PROJECTED KWH / YEAR', 'VIEWING HOURS PER DAY');
    const x = index => frame.left + index * (frame.right - frame.left) / 4;
    hours.forEach((hour, index) => {
      lineChart.append(svg('text', { x: x(index), y: frame.bottom + 27, 'text-anchor': 'middle', class: 'story-tick' }, String(hour)));
    });
    const path = model => model.scenarioKwh.map((value, index) =>
      `${index ? 'L' : 'M'} ${x(index).toFixed(1)} ${frame.y(value).toFixed(1)}`).join(' ');
    background.forEach(model => {
      lineChart.append(svg('path', { d: path(model), fill: 'none', stroke: '#89978f',
        'stroke-width': 1, 'stroke-opacity': .09 }));
    });
    selected.forEach((model, index) => {
      const color = lineColors[index];
      lineChart.append(svg('path', { d: path(model), fill: 'none', stroke: color,
        'stroke-width': 3.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      model.scenarioKwh.forEach((value, hourIndex) => {
        const hour = hours[hourIndex];
        const dot = svg('circle', { cx: x(hourIndex), cy: frame.y(value), r: 7,
          fill: color, stroke: '#fffef9', 'stroke-width': 2 });
        attachTooltip(dot, {
          eyebrow: `${hour} VIEWING HOURS PER DAY`,
          heading: modelLabel(model),
          value: `${two.format(value)} projected kWh/year`,
          rows: [
            ['Screen / display', `${one.format(model.screenInches)} in · ${model.technology}`],
            ['Viewing power', `${one.format(model.onW)} W`],
            ['Passive standby', `${two.format(model.passiveW)} W`],
            ['Active standby', `${two.format(model.activeW)} W for ${one.format(model.activeHours)} h/day`],
          ],
        });
        lineChart.append(dot);
      });
    });
    lineNote.textContent = `${whole.format(matching.length)} model rows match the filters. ` +
      `${whole.format(background.length)} faint comparison lines and ${selected.length} selected models are shown. ` +
      'Hover or focus a coloured point for its model details. The vertical scale follows the displayed lines. The faint sample omits the top 2% of 10-hour projections to keep the main comparison readable.';
  }

  function showSearchResults() {
    const search = modelSearch.value.trim().toLocaleLowerCase();
    modelResults.replaceChildren();
    const matches = matchingLineModels().filter(model =>
      !selectedIds.includes(model.id) &&
      (!search || `${model.brand} ${model.model} ${model.technology}`.toLocaleLowerCase().includes(search)))
      .slice(0, 8);
    if (selectedIds.length === 4 || !matches.length) {
      const message = document.createElement('p');
      message.textContent = selectedIds.length === 4 ? 'Remove one model before adding another.' : 'No matching models.';
      modelResults.append(message);
    } else {
      matches.forEach(model => {
        const button = document.createElement('button');
        button.type = 'button';
        const label = document.createElement('strong');
        label.textContent = modelLabel(model);
        const detail = document.createElement('small');
        detail.textContent = `${one.format(model.screenInches)} in · ${model.technology} · ${one.format(model.onW)} W viewing`;
        button.append(label, detail);
        button.addEventListener('click', () => {
          selectedIds.push(model.id);
          modelSearch.value = '';
          modelResults.hidden = true;
          renderLineSection();
          modelSearch.focus();
        });
        modelResults.append(button);
      });
    }
    modelResults.hidden = false;
  }

  function renderLineSection() {
    const matching = matchingLineModels();
    const availableIds = new Set(matching.map(model => model.id));
    selectedIds = selectedIds.filter(id => availableIds.has(id));
    renderSelected();
    renderLineChart(matching);
  }

  [lineTech, lineSize].forEach(select => select.addEventListener('change', () => {
    renderLineSection();
    modelResults.hidden = true;
  }));
  modelSearch.addEventListener('input', showSearchResults);
  modelSearch.addEventListener('focus', showSearchResults);
  document.addEventListener('click', event => {
    if (!event.target.closest('.model-picker')) modelResults.hidden = true;
  });

  // Angle 2: live means retain the grouping and arithmetic of the KNIME branch.
  const standbySize = document.getElementById('standby-size');
  const standbyTech = document.getElementById('standby-tech');
  const standbyCounts = document.getElementById('standby-counts');
  const totalChart = document.getElementById('total-energy-chart');
  const standbyChart = document.getElementById('standby-energy-chart');
  technologyOptions(standbyTech);
  standbyTech.value = 'LCD (LED)';

  function standbyModels() {
    return models.filter(model => {
      const size = model.screenInches;
      if (standbyTech.value !== 'all' && model.technology !== standbyTech.value) return false;
      if (standbySize.value === '55to65' && (size < 55 || size > 65)) return false;
      if (standbySize.value === 'under55' && size >= 55) return false;
      if (standbySize.value === 'over65' && size <= 65) return false;
      return true;
    });
  }

  function groupMeans(group) {
    if (!group.length) return hours.map(() => ({ on: 0, passive: 0, active: 0 }));
    return hours.map(hour => {
      const sums = group.reduce((sum, model) => {
        sum.on += .365 * hour * model.onW;
        sum.active += .365 * model.activeHours * model.activeW;
        sum.passive += .365 * (24 - hour - model.activeHours) * model.passiveW;
        return sum;
      }, { on: 0, active: 0, passive: 0 });
      return { on: sums.on / group.length, active: sums.active / group.length,
        passive: sums.passive / group.length };
    });
  }

  function drawEnergyBars(node, values, counts, standbyOnly) {
    const height = standbyOnly ? 390 : 430;
    const totals = values.flatMap(group => group.map(parts =>
      standbyOnly ? parts.active + parts.passive : parts.on + parts.active + parts.passive));
    const upper = niceTop(Math.max(1, ...totals) * 1.06);
    const frame = plotFrame(node, height, upper,
      standbyOnly ? 'STANDBY KWH / YEAR · ZOOMED SCALE' : 'PROJECTED KWH / YEAR', 'VIEWING HOURS PER DAY');
    const centers = hours.map((_, index) => frame.left + 80 + index * (frame.right - frame.left - 160) / 4);
    const groups = ['No active', 'Active'];
    const width = 42;
    hours.forEach((hour, index) => {
      const center = centers[index];
      node.append(svg('text', { x: center, y: frame.bottom + 36, 'text-anchor': 'middle', class: 'story-tick' }, String(hour)));
      groups.forEach((groupName, groupIndex) => {
        const parts = values[groupIndex][index];
        const x = center + (groupIndex === 0 ? -width - 5 : 5);
        const segments = standbyOnly
          ? [['passive', parts.passive], ['active', parts.active]]
          : [['on', parts.on], ['passive', parts.passive], ['active', parts.active]];
        let cumulative = 0;
        segments.forEach(([kind, value]) => {
          if (value <= 0) return;
          const next = cumulative + value;
          const rect = svg('rect', { x, y: frame.y(next), width,
            height: Math.max(0, frame.y(cumulative) - frame.y(next)), fill: barColors[kind] });
          node.append(rect);
          cumulative = next;
        });
        if (cumulative > 0) {
          const total = parts.on + parts.passive + parts.active;
          const standby = parts.passive + parts.active;
          const hit = svg('rect', { x, y: frame.y(cumulative), width,
            height: frame.bottom - frame.y(cumulative), fill: 'transparent', class: 'story-bar-hit' });
          attachTooltip(hit, {
            eyebrow: `${hour} VIEWING HOURS PER DAY · ${standbyOnly ? 'STANDBY DETAIL' : 'TOTAL ENERGY'}`,
            heading: `${groupName} standby group`,
            value: `${two.format(standbyOnly ? standby : total)} kWh/year ${standbyOnly ? 'standby' : 'total'}`,
            rows: [
              ['Model rows', whole.format(counts[groupIndex])],
              ['Viewing', `${two.format(parts.on)} kWh/year`],
              ['Passive standby', `${two.format(parts.passive)} kWh/year`],
              ['Active standby', `${two.format(parts.active)} kWh/year`],
              ['Standby share of total', `${one.format(standby / total * 100)}%`],
            ],
          });
          node.append(hit);
        }
        node.append(svg('text', { x: x + width / 2, y: frame.bottom + 17,
          'text-anchor': 'middle', class: 'story-bar-key' }, groupIndex === 0 ? 'N' : 'A'));
      });
    });
    node.append(svg('text', { x: frame.right, y: 30, 'text-anchor': 'end', class: 'story-chart-hint' },
      'N = no active standby · A = active standby'));
  }

  function renderStandby() {
    hideTooltip();
    const filtered = standbyModels();
    const noActive = filtered.filter(model => model.activeHours === 0);
    const active = filtered.filter(model => model.activeHours > 0);
    standbyCounts.textContent = `${whole.format(filtered.length)} model rows · N: ${whole.format(noActive.length)} without active standby · A: ${whole.format(active.length)} with active standby`;
    const noMeans = groupMeans(noActive);
    const activeMeans = groupMeans(active);
    const counts = [noActive.length, active.length];
    drawEnergyBars(totalChart, [noMeans, activeMeans], counts, false);
    drawEnergyBars(standbyChart, [noMeans, activeMeans], counts, true);
    document.getElementById('total-note').textContent = filtered.length
      ? `At 4 h/day in this cohort, mean viewing energy is ${two.format(noMeans[1].on)} kWh/year for N and ${two.format(activeMeans[1].on)} for A. Hover or focus a bar for the full breakdown.`
      : 'No model rows match these filters. Choose a broader size or technology.';
  }
  [standbySize, standbyTech].forEach(select => select.addEventListener('change', renderStandby));

  // Angle 3: medians of E_6 - E_4 over the full cleaned model table.
  function renderSavings() {
    const chart = document.getElementById('savings-chart');
    const groups = [
      { key: 'Small', label: 'Small · ≤43 in', color: '#75979a' },
      { key: 'Medium', label: 'Medium · >43–66 in', color: '#c47b20' },
      { key: 'Large', label: 'Large · >66 in', color: '#a14d55' },
    ].map(group => {
      const subset = models.filter(model => sizeGroup(model) === group.key);
      return { ...group, value: median(subset.map(model => model.saving2h)), n: subset.length };
    });
    const upper = niceTop(Math.max(...groups.map(group => group.value)) * 1.05);
    const frame = plotFrame(chart, 490, upper, 'PROJECTED SAVING · KWH / YEAR', 'SCREEN SIZE GROUP', 120);
    const centers = [220, 515, 810];
    groups.forEach((group, index) => {
      const x = centers[index] - 74;
      const top = frame.y(group.value);
      const bar = svg('rect', { x, y: top, width: 148, height: frame.bottom - top,
        fill: group.color, rx: 3 });
      bar.append(svg('title', {}, `${group.label}: ${one.format(group.value)} median projected kWh/year saved; ${whole.format(group.n)} model rows`));
      chart.append(bar);
      chart.append(svg('text', { x: centers[index], y: top - 13,
        'text-anchor': 'middle', class: 'saving-value' }, `${one.format(group.value)} kWh`));
      chart.append(svg('text', { x: centers[index], y: frame.bottom + 25,
        'text-anchor': 'middle', class: 'story-tick' }, group.label));
      chart.append(svg('text', { x: centers[index], y: frame.bottom + 44,
        'text-anchor': 'middle', class: 'story-bar-key' }, `n = ${whole.format(group.n)} model rows`));
    });
    document.getElementById('savings-note').textContent =
      `Small ${one.format(groups[0].value)} · Medium ${one.format(groups[1].value)} · Large ${one.format(groups[2].value)} kWh/year. ` +
      'Medians describe model rows, not TVs sold or measured household savings.';
  }

  if (!models.length) {
    lineNote.textContent = 'The processed October TV data could not be loaded.';
    standbyCounts.textContent = 'Data unavailable.';
    return;
  }
  renderLineSection();
  renderStandby();
  renderSavings();
})();
