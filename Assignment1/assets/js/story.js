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
    tooltip.classList.toggle('story-tooltip--compact', Boolean(data.compact));
    const eyebrow = document.createElement('span');
    eyebrow.className = 'story-tooltip-eyebrow';
    eyebrow.textContent = data.eyebrow;
    const heading = document.createElement('strong');
    heading.className = 'story-tooltip-heading';
    heading.textContent = data.heading;
    const value = document.createElement('div');
    value.className = 'story-tooltip-value';
    value.textContent = data.value;
    tooltip.append(eyebrow, heading, value);
    if (data.rows?.length) {
      const details = document.createElement('dl');
      data.rows.forEach(([label, content]) => {
        const term = document.createElement('dt');
        term.textContent = label;
        const description = document.createElement('dd');
        description.textContent = content;
        details.append(term, description);
      });
      tooltip.append(details);
    }
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
    node.replaceChildren();
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

  function plotFrame(node, height, upper, yCaption, xCaption, bottomPad = 75, gridMode = 'full') {
    clearPlot(node);
    const left = 86, right = 945, top = 55, bottom = height - bottomPad;
    const y = value => bottom - (value / upper) * (bottom - top);
    const step = upper / 5;
    for (let i = 0; i <= 5; i++) {
      const value = i * step;
      const yy = y(value);
      if (gridMode === 'full') {
        node.append(svg('line', { x1: left, y1: yy, x2: right, y2: yy, class: 'story-grid-line' }));
      } else if (i > 0) {
        node.append(svg('line', { x1: left - 9, y1: yy, x2: left, y2: yy, class: 'story-axis-tick' }));
      }
      node.append(svg('text', { x: left - 14, y: yy + 5, 'text-anchor': 'end', class: 'story-tick' },
        upper <= 10 ? one.format(value) : whole.format(value)));
    }
    node.append(svg('line', { x1: left, y1: bottom, x2: right, y2: bottom, class: 'story-axis-line' }));
    node.append(svg('text', { x: left, y: 30, class: 'story-axis-caption' }, yCaption));
    node.append(svg('text', { x: (left + right) / 2, y: height - 18, 'text-anchor': 'middle', class: 'story-axis-caption' }, xCaption));
    return { left, right, top, bottom, y, step };
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
    const meanValues = hours.map((_, index) => {
      const values = matching.map(model => Number(model.scenarioKwh[index])).filter(Number.isFinite);
      return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    });
    const topValue = Math.max(1, ...selected.concat(background).map(model => Math.max(...model.scenarioKwh)),
      ...meanValues.filter(Number.isFinite));
    const upper = niceTop(topValue * 1.06);
    const frame = plotFrame(lineChart, 490, upper, 'PROJECTED KWH / YEAR', 'VIEWING HOURS PER DAY');
    const x = index => frame.left + index * (frame.right - frame.left) / 4;
    hours.forEach((hour, index) => {
      lineChart.append(svg('text', { x: x(index), y: frame.bottom + 27, 'text-anchor': 'middle', class: 'story-tick' }, String(hour)));
    });
    const pathFromValues = values => values.map((value, index) =>
      `${index ? 'L' : 'M'} ${x(index).toFixed(1)} ${frame.y(value).toFixed(1)}`).join(' ');
    const path = model => pathFromValues(model.scenarioKwh);
    background.forEach(model => {
      lineChart.append(svg('path', { d: path(model), fill: 'none', stroke: '#89978f',
        'stroke-width': 1, 'stroke-opacity': .09 }));
    });
    if (matching.length) {
      const meanName = `Mean of ${whole.format(matching.length)} matching model rows`;
      lineChart.append(svg('path', { d: pathFromValues(meanValues), fill: 'none', stroke: '#263238',
        'stroke-width': 4, 'stroke-dasharray': '11 8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      meanValues.forEach((value, index) => {
        const dot = svg('circle', { cx: x(index), cy: frame.y(value), r: 5,
          fill: '#fffef9', stroke: '#263238', 'stroke-width': 2.5 });
        attachTooltip(dot, {
          eyebrow: `${hours[index]} VIEWING HOURS PER DAY`,
          heading: meanName,
          value: `${two.format(value)} kWh/year`,
          compact: true,
        });
        lineChart.append(dot);
      });
      const key = document.createElement('div');
      key.className = 'line-legend-item line-legend-item--mean';
      const swatch = document.createElement('i');
      const label = document.createElement('span');
      label.textContent = meanName;
      key.append(swatch, label);
      lineLegend.prepend(key);
    }
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
          value: `${two.format(value)} kWh/year`,
          rows: [['Viewing power', `${one.format(model.onW)} W`]],
          compact: true,
        });
        lineChart.append(dot);
      });
    });
    lineNote.textContent = `${whole.format(matching.length)} model rows match the filters. ` +
      `The dashed line averages all of them; ${whole.format(background.length)} faint comparison lines and ${selected.length} selected models are shown. ` +
      'Hover or focus a point for details. The vertical scale follows the displayed lines. The faint sample omits the top 2% of 10-hour projections to keep the main comparison readable.';
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

  // Angle 2: compare standby power across technologies, then annual standby energy.
  const standbySize = document.getElementById('standby-size');
  const standbyTech = document.getElementById('standby-tech');
  const standbyCounts = document.getElementById('standby-counts');
  const techPowerChart = document.getElementById('tech-power-chart');
  const standbyChart = document.getElementById('standby-energy-chart');
  const techPowerNote = document.getElementById('tech-power-note');
  technologyOptions(standbyTech);
  standbyTech.value = 'LCD (LED)';
  const standbyTechnologies = [...new Set(models.map(model => model.technology))].sort();

  function standbyModels(includeTechnology = true) {
    return models.filter(model => {
      const size = model.screenInches;
      if (includeTechnology && standbyTech.value !== 'all' && model.technology !== standbyTech.value) return false;
      if (standbySize.value === '55to65' && (size < 55 || size > 65)) return false;
      if (standbySize.value === 'under55' && size >= 55) return false;
      if (standbySize.value === 'over65' && size <= 65) return false;
      return true;
    });
  }

  function powerSummary(rows, field) {
    const values = rows.map(model => Number(model[field])).filter(Number.isFinite);
    return { n: values.length, mean: values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    median: median(values) };
  }

  function renderTechPowerChart(sizeMatched) {
    clearPlot(techPowerChart);
    const summaries = standbyTechnologies.map(technology => {
      const rows = sizeMatched.filter(model => model.technology === technology);
      const activeRows = rows.filter(model => model.activeHours > 0);
      return { technology, passive: powerSummary(rows, 'passiveW'),
        active: powerSummary(activeRows, 'activeW') };
    });
    const panels = [
      { key: 'passive', label: 'PASSIVE STANDBY · W', left: 76, right: 476, color: barColors.passive },
      { key: 'active', label: 'ACTIVE STANDBY · W', left: 576, right: 976, color: barColors.active },
    ];
    const top = 76, bottom = 355;
    techPowerChart.append(svg('line', { x1: 526, y1: 27, x2: 526, y2: 422,
      class: 'story-tech-divider' }));
    panels.forEach(panel => {
      const upper = niceTop(Math.max(.1, ...summaries.map(summary => summary[panel.key].mean || 0)) * 1.15);
      const y = value => bottom - value / upper * (bottom - top);
      techPowerChart.append(svg('text', { x: panel.left, y: 29,
        class: 'story-axis-caption' }, panel.label));
      for (let index = 0; index <= 4; index++) {
        const value = upper * index / 4;
        const yy = y(value);
        techPowerChart.append(svg('line', { x1: panel.left - 8, y1: yy,
          x2: panel.left, y2: yy, class: 'story-axis-tick' }));
        const label = value === 0 ? '0' : value < 1 ? value.toFixed(2).replace(/0$/, '') : one.format(value);
        techPowerChart.append(svg('text', { x: panel.left - 13, y: yy + 4,
          'text-anchor': 'end', class: 'story-tick' }, label));
      }
      techPowerChart.append(svg('line', { x1: panel.left, y1: bottom,
        x2: panel.right, y2: bottom, class: 'story-axis-line' }));
      summaries.forEach((summary, index) => {
        const value = summary[panel.key];
        const center = panel.left + (index + .5) * (panel.right - panel.left) / summaries.length;
        const selected = standbyTech.value === 'all' || standbyTech.value === summary.technology;
        if (value.n) {
          const barWidth = 74;
          const x = center - barWidth / 2;
          const bar = svg('rect', { x, y: y(value.mean), width: barWidth,
             height: bottom - y(value.mean), rx: 3, fill: panel.color,
             opacity: selected ? 1 : .62 });
          attachTooltip(bar, {
            eyebrow: `${panel.label} · ${summary.technology}`,
            heading: summary.technology,
             value: `${two.format(value.mean)} W mean`,
             rows: [['Median', `${two.format(value.median)} W`],
               ['Model rows', whole.format(value.n)]],
          });
           bar.setAttribute('role', 'button');
           bar.setAttribute('aria-label', `Select ${summary.technology}; ${panel.label}; mean ${two.format(value.mean)} watts, median ${two.format(value.median)} watts; ${whole.format(value.n)} model rows`);
          const chooseTechnology = () => {
            standbyTech.value = summary.technology;
            renderStandby();
          };
          bar.addEventListener('click', chooseTechnology);
          bar.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              chooseTechnology();
            }
          });
          techPowerChart.append(bar);
          techPowerChart.append(svg('text', { x: center, y: y(value.mean) - 12,
            'text-anchor': 'middle', class: 'saving-value' }, `${two.format(value.mean)} W`));
        } else {
          techPowerChart.append(svg('text', { x: center, y: bottom - 12,
            'text-anchor': 'middle', class: 'story-tick' }, 'No data'));
        }
        techPowerChart.append(svg('text', { x: center, y: bottom + 24,
          'text-anchor': 'middle', class: 'story-tick' }, summary.technology));
        techPowerChart.append(svg('text', { x: center, y: bottom + 44,
          'text-anchor': 'middle', class: 'story-bar-key' }, `n = ${whole.format(value.n)}`));
      });
    });
    const activeCount = summaries.reduce((sum, summary) => sum + summary.active.n, 0);
    techPowerNote.textContent = `${whole.format(sizeMatched.length)} model rows match the size filter; ` +
      `${whole.format(activeCount)} have active standby. Bars show mean watts; medians appear on hover. ` +
      'Separate vertical scales both start at zero.';
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

  function drawStandbyBars(node, values, counts) {
    const totals = values.flatMap(group => group.map(parts => parts.active + parts.passive));
    const upper = niceTop(Math.max(1, ...totals) * 1.06);
    const frame = plotFrame(node, 390, upper,
      'STANDBY KWH / YEAR', 'VIEWING HOURS PER DAY', 75, 'bar-ticks');
    const centers = hours.map((_, index) => frame.left + 80 + index * (frame.right - frame.left - 160) / 4);
    const groups = ['No active', 'Active'];
    const width = 42;
    hours.forEach((hour, index) => {
      const center = centers[index];
      node.append(svg('text', { x: center, y: frame.bottom + 36, 'text-anchor': 'middle', class: 'story-tick' }, String(hour)));
      groups.forEach((groupName, groupIndex) => {
        const parts = values[groupIndex][index];
        const x = center + (groupIndex === 0 ? -width - 5 : 5);
        const segments = [['passive', parts.passive], ['active', parts.active]];
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
          for (let tick = frame.step; tick < cumulative; tick += frame.step) {
            const yy = frame.y(tick);
            node.append(svg('line', { x1: x, y1: yy, x2: x + width, y2: yy,
              class: 'story-bar-scale-mark' }));
          }
          const standby = parts.passive + parts.active;
          const hit = svg('rect', { x, y: frame.y(cumulative), width,
            height: frame.bottom - frame.y(cumulative), fill: 'transparent', class: 'story-bar-hit' });
          attachTooltip(hit, {
            eyebrow: `${hour} VIEWING HOURS PER DAY · STANDBY DETAIL`,
            heading: `${groupName} standby group`,
            value: `${two.format(standby)} kWh/year standby`,
            rows: [
              ['Model rows', whole.format(counts[groupIndex])],
              ['Passive standby', `${two.format(parts.passive)} kWh/year`],
              ['Active standby', `${two.format(parts.active)} kWh/year`],
            ],
          });
          node.append(hit);
        }
        node.append(svg('text', { x: x + width / 2, y: frame.bottom + 17,
          'text-anchor': 'middle', class: 'story-bar-key' }, groupIndex === 0 ? 'N' : 'A'));
      });
    });
  }

  function renderStandby() {
    hideTooltip();
    renderTechPowerChart(standbyModels(false));
    const filtered = standbyModels();
    const noActive = filtered.filter(model => model.activeHours === 0);
    const active = filtered.filter(model => model.activeHours > 0);
    standbyCounts.textContent = `${whole.format(filtered.length)} model rows · N: ${whole.format(noActive.length)} without active standby · A: ${whole.format(active.length)} with active standby`;
    const noMeans = groupMeans(noActive);
    const activeMeans = groupMeans(active);
    const counts = [noActive.length, active.length];
    drawStandbyBars(standbyChart, [noMeans, activeMeans], counts);
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
    const frame = plotFrame(chart, 490, upper, 'PROJECTED SAVING · KWH / YEAR',
      'SCREEN SIZE GROUP', 120, 'bar-ticks');
    const centers = [220, 515, 810];
    groups.forEach((group, index) => {
      const x = centers[index] - 74;
      const top = frame.y(group.value);
      const bar = svg('rect', { x, y: top, width: 148, height: frame.bottom - top,
        fill: group.color, rx: 3 });
      attachTooltip(bar, {
        eyebrow: 'TWO FEWER VIEWING HOURS PER DAY',
        heading: group.label,
        value: `${one.format(group.value)} kWh/year saved`,
        rows: [['Model rows', whole.format(group.n)]],
        compact: true,
      });
      chart.append(bar);
      for (let tick = frame.step; tick < group.value; tick += frame.step) {
        const yy = frame.y(tick);
        chart.append(svg('line', { x1: x, y1: yy, x2: x + 148, y2: yy,
          class: 'story-bar-scale-mark' }));
      }
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
