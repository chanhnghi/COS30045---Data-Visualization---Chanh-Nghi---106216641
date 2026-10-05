"""Build the browser snapshot with the same filters and formulas as the KNIME workflow.

Usage: python tools/build_snapshot.py path/to/tv_2026_10_03.csv
"""

import csv
import json
import math
import sys
from pathlib import Path


HOURS = (2, 4, 6, 8, 10)
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "data" / "tv-snapshot.js"


def numeric(row, column):
    try:
        value = float(row[column])
    except (TypeError, ValueError):
        return None
    return value if math.isfinite(value) else None


def main(source):
    raw_count = eligible_count = 0
    models = []
    with source.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            raw_count += 1
            if not (
                row["SubmitStatus"] == "Approved"
                and row["Availability Status"] == "Available"
                and "Australia" in row["SoldIn"]
            ):
                continue
            eligible_count += 1

            passive = numeric(row, "Pasv_stnd_power")
            active = numeric(row, "Act_stnd_power")
            active_hours = numeric(row, "Act_stnd_time")
            on = numeric(row, "Avg_mode_power")
            centimetres = numeric(row, "screensize")
            labelled = numeric(row, "Labelled energy consumption (kWh/year)")
            if any(value is None for value in (passive, active, active_hours, on, centimetres, labelled)):
                continue
            if any(value < 0 for value in (passive, active, active_hours, on)):
                continue
            if 10 + active_hours > 24:
                continue

            scenario = [
                0.365 * (hours * on + active_hours * active + (24 - hours - active_hours) * passive)
                for hours in HOURS
            ]
            registration = row["Registration Number"]
            model_name = row["Model_No"]
            models.append({
                "id": f"{registration}|{model_name}",
                "registration": registration,
                "brand": row["Brand_Reg"],
                "model": model_name,
                "screenInches": centimetres / 2.54,
                "technology": row["Screen_Tech"],
                "annualKwh": labelled,
                "stars": numeric(row, "Star2"),
                "onW": on,
                "passiveW": passive,
                "activeW": active,
                "activeHours": active_hours,
                "scenarioKwh": scenario,
                "saving2h": scenario[2] - scenario[1],
            })

    if len({model["id"] for model in models}) != len(models):
        raise ValueError("Registration and model combinations are not unique")

    snapshot = {
        "sourceFile": source.name,
        "snapshotDate": "2026-10-03",
        "processing": "Matches Demonstrate 1 KNIME: Approved, Available, SoldIn Australia; numeric standby fields; E_h formula.",
        "rawRows": raw_count,
        "eligibleRows": eligible_count,
        "models": models,
    }
    OUTPUT.write_text(
        "window.TV_SNAPSHOT = " + json.dumps(snapshot, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(models)} model rows to {OUTPUT}")
    print(f"Raw: {raw_count}; eligible: {eligible_count}; complete: {len(models)}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python tools/build_snapshot.py path/to/tv_2026_10_03.csv")
    main(Path(sys.argv[1]))
