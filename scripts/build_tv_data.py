"""Build the small, browser-friendly TV snapshot used by Assignment1.

Usage: python scripts/build_tv_data.py path/to/tv_2026_02_15.csv
"""

import csv
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "Assignment1" / "assets" / "data" / "tv-snapshot.js"


def number(value):
    try:
        result = float(value)
        return result if result == result else None
    except (TypeError, ValueError):
        return None


def build(source):
    models = []
    with source.open(encoding="utf-8-sig", newline="") as stream:
        for row in csv.DictReader(stream):
            size_cm = number(row.get("screensize"))
            annual_kwh = number(row.get("Labelled energy consumption (kWh/year)"))
            stars = number(row.get("Star2"))
            sold_in = [place.strip() for place in row.get("SoldIn", "").split(",")]
            if (
                row.get("Availability Status") != "Available"
                or "Australia" not in sold_in
                or size_cm is None
                or annual_kwh is None
                or not 25 < size_cm < 400
                or not 0 < annual_kwh < 3000
            ):
                continue

            models.append(
                {
                    "brand": row.get("Brand_Reg", "").strip().upper(),
                    "model": row.get("Model_No", "").strip(),
                    "screenInches": round(size_cm / 2.54, 1),
                    "technology": row.get("Screen_Tech", "").strip(),
                    "annualKwh": round(annual_kwh),
                    "stars": stars,
                }
            )

    models.sort(key=lambda item: (item["brand"], item["model"]))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        "window.TV_SNAPSHOT = " + json.dumps(
            {
                "sourceFile": source.name,
                "snapshotDate": "2026-02-15",
                "selection": "Rows marked Available, sold in Australia, with valid screen size and annual energy values.",
                "models": models,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ) + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(models)} models to {OUTPUT}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/build_tv_data.py path/to/tv.csv")
    build(Path(sys.argv[1]))
