# Still On — Appliance Energy Consumption Website

A three-page COS30045 Data Visualisation website. The Home page introduces the story, Televisions contains three interactive energy views and the register explorer, and About us explains the source, calculations, and limits. It uses semantic HTML, one stylesheet, and vanilla JavaScript. No external JavaScript library is needed.

## Preview and hosting

Open `Exercise 0.2/index.html` in a browser. The processed data is included in `Exercise 0.2/assets/data/tv-snapshot.js`, so the pages also work offline. For Mercury, upload the contents of `Exercise 0.2/` into a folder under `~/cos30045/www/htdocs/`, preserving the `assets/` paths. The lecturer separately approved use of a personal GitHub repository when GitHub Classroom was unavailable.

## Source and preparation

The source is `tv_2026_10_03.csv`, supplied separately and dated 3 October 2026. This site keeps rows where `SubmitStatus = Approved`, `Availability Status = Available`, and `SoldIn` contains Australia. The raw file has 5,340 rows; 4,844 meet those three conditions. The 3,990 rows used by the story also have complete numeric screen size, labelled kWh, viewing power, passive standby power, active standby power, and active standby time. Negative power values and rows that cannot accommodate the 10-hour scenario are excluded. Screen size is converted from centimetres to inches.

The preparation and scenarios match the student's `Demonstrate 1` KNIME workflow. `Exercise 0.2/tools/build_snapshot.py` repeats its selection and calculations to create the browser-friendly data object. The checked-in file is generated from the CSV, **not exported by the KNIME chart node**. Rebuild it with:

```text
python "Exercise 0.2/tools/build_snapshot.py" "D:\COS30045_Data_Visualization\Demonstrate 1\tv_2026_10_03.csv"
```

For a model viewed `h` hours every day (h = 2, 4, 6, 8, 10), the projection is:

```text
yearly kWh = 0.365 × [h × Avg_mode_power
  + Act_stnd_time × Act_stnd_power
  + (24 − h − Act_stnd_time) × Pasv_stnd_power]
```

The three views show: (1) up to four selected model lines over as many as 300 faint comparison lines, with live size and technology filters; (2) mean viewing and standby components for models with or without active standby, with a second zero-baseline chart that magnifies standby; and (3) median projected yearly kWh saved by reducing viewing two hours per day, grouped by screen size. The 55–65 inch LCD (LED) default for angle 2 has 647 model rows: 569 with no active standby and 78 with active standby. At four hours per day the corresponding mean viewing components are 193.96 and 188.84 kWh/year. These are different sets of models, so their difference cannot be attributed to standby alone. Angle 3 medians are 28.1, 71.9, and 132.5 kWh/year for small (n=848), medium (n=1,854), and large (n=1,288) model rows.

The original scatterplot remains below the three views and shows **labelled annual energy**, a separate standardised source value. It uses fixed axes when filtered. The table lists the ten lowest labelled annual kWh values among the current filters; it is not an efficiency ranking.

## Reading the results

Each row represents a model entry in a registration, **not a TV sold**. One registration number may contain several model entries. The simulation assumes the same pattern for 365 days and holds active standby time fixed when viewing time changes. It is based on registered power figures, not measured household viewing hours, energy bills, or live retail stock. A two-hour reduction anywhere between the five shown scenarios has the same projected saving for a given model because the formula is linear in viewing time. The default cohort in angle 2 is an example, and users can switch the size and technology filters.

The separate Home calculator intentionally uses a simpler formula that ignores standby:

```text
daily kWh = watts / 1000 × hours per day
yearly kWh = daily kWh × 365
yearly cost (AUD) = yearly kWh × electricity price (cents/kWh) / 100
```

## Generative AI reflection

**Tool:** OpenAI Codex.

**Assistance:** Planning, visual design, implementation, CSV preparation script, web chart logic, and debugging. The student created and reviewed the KNIME workflow and should check the final numbers and explain the formulas, filtering, SVG marks, and interaction during the demonstration.

**Student reflection:** To be completed by the student in their own words after reviewing the work.
