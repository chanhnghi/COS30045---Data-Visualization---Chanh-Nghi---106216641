# Wattwise — Appliance Energy Consumption Website

A three-page website for COS30045 Exercise 0.2. It uses semantic HTML, one external CSS file, and vanilla JavaScript. The television data is a temporary snapshot for learning and will be replaced when the Assignment 1 dataset and angle are chosen.

## Pages

- `Exercise 0.2/index.html` — Home, JavaScript FAQ, and optional energy calculator.
- `Exercise 0.2/televisions.html` — interactive TV scatterplot, filters, summary values, and model table.
- `Exercise 0.2/about.html` — purpose, source, selection rules, and limitations.

All three pages share the same navigation, supplied power logo, stylesheet, and footer. The logo links to Home. The active page has `aria-current="page"`.

## Preview and hosting

Open `Exercise 0.2/index.html` in a browser to preview the site. The TV data is included as a local JavaScript data file, so the prototype also works without a development server. For Mercury, upload the contents of `Exercise 0.2/` into a folder under `~/cos30045/www/htdocs/`, keeping the `assets/` folder and relative paths intact.

The exercise permits GitHub. The lecturer has separately approved using a personal GitHub repository because GitHub Classroom was unavailable. Make regular, meaningful commits as the work changes, and keep this README with the code.

## Temporary data and calculations

The source is `tv_2026_02_15.csv`, supplied separately for class work. `scripts/build_tv_data.py` creates `Exercise 0.2/assets/data/tv-snapshot.js` from that CSV. The generated file is checked into the website so Mercury does not need Python or access to the original CSV.

The snapshot contains **4,508 registration records** marked `Available`, sold in Australia, with plausible numeric screen size and labelled annual energy consumption. Some brand/model pairs appear in multiple records. Screen size is converted from centimetres to inches. Brand names are normalised to uppercase. The status and labelled energy are properties of the 15 February 2026 file, not live retail stock or a prediction of a household bill. The scatterplot keeps fixed axes while filters change, so its visual scale remains comparable. The table lists the ten lowest annual kWh values under the current filters; it is not an efficiency ranking because screen sizes differ.

To regenerate with the present source file:

```text
python scripts/build_tv_data.py D:\COS30045_Data_Visualization\tv_2026_02_15.csv
```

The optional calculator uses:

```text
daily kWh = watts / 1000 × hours per day
yearly kWh = daily kWh × 365
yearly cost (AUD) = yearly kWh × electricity price (cents/kWh) / 100
```

The calculator validates missing or invalid input and updates results within the page. The estimate assumes identical usage every day and does not model standby draw or varying electricity tariffs.

## Design decisions

- Position on shared axes encodes screen size and annual energy, since it supports accurate comparison.
- Filters let a visitor compare a narrower group without changing chart scale.
- The source date and limitations appear near the data, so the temporary snapshot is not mistaken for current market availability.
- The supplied power logo sets the cream, amber, and brown palette. One external CSS file keeps the visual language consistent.
- The FAQ uses buttons with `aria-expanded` and hidden answer panels. The chart is accompanied by a model table and descriptive text.

## Generative AI Reflection

**Tools used:** OpenAI Codex.

**What GenAI helped with:** Planning the page structure, drafting HTML/CSS/JavaScript, generating the temporary TV data view, and checking the implementation against the Exercise 0.2 requirements.

**What was changed or adapted:** The initial files were empty. The generated layout was adapted to use the supplied power logo and colours, the actual TV CSV columns, plain JavaScript, and clear notes about the snapshot's limitations. The student should review this section after making any further personal changes.

**What I learned:** _Student to complete after reviewing and explaining the code during preparation for the demonstration._ Suggested points to consider: event handling, DOM updates, the watts-to-kWh calculation, SVG marks and channels, and how the CSV is filtered.

**Limitations or issues:** The current TV file is temporary and dated. `Available` in the source is not proof of current stock. A different dataset and visualisation angle may be needed for Assignment 1. The student should verify every claim and explain each code change before submission.
