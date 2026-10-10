"""Render the supplied KNIME workflow as a readable, self-contained SVG.

Usage: python tools/render_workflow.py "path/to/workflow.knwf"
The source workflow is read only; the SVG is written to assets/img.
"""

from __future__ import annotations

import sys
import textwrap
import xml.etree.ElementTree as ET
import zipfile
from html import escape
from html.parser import HTMLParser
from pathlib import Path


CAPTIONS = {
    2: "Load the TV dataset",
    4: "Keep approved, available TVs which are sold in Australia regions",
    3: "Keep fields needed for analysis",
    5: "Convert standby fields to numbers",
    6: "Remove rows with missing values",
    13: "Convert screen size to inches",
    7: "Calculate energy at 2h/day",
    11: "Calculate energy at 4h/day",
    14: "Calculate energy at 6h/day",
    12: "Calculate energy at 8h/day",
    10: "Calculate energy at 10h/day",
    8: "Sample 200 model rows",
    9: "Plot energy across viewing hours",
    15: "Select 55–65 in LCD (LED) models",
    18: "Set 2, 4, 6, 8, 10 hours",
    16: "Pair each model with every hour",
    17: "Classify active standby status",
    19: "Calculate viewing energy",
    21: "Calculate active standby energy",
    20: "Calculate passive standby energy",
    22: "Average energy by hour and group",
    24: "Name the chart columns",
    23: "Show total energy breakdown",
    25: "Zoom in on standby energy",
    26: "Calculate saving from every 2-hour decrease watch time",
    27: "Group models by screen size",
    28: "Find median saving by size",
    29: "Name the chart columns",
    30: "Compare savings across size groups",
    31: "Copy CSV into workflow data",
}

GLYPHS = {
    "CSV Reader": "CSV",
    "Transfer Files": "⇄",
    "Row Filter": "≠",
    "Column Filter": "↓",
    "String to Number": "S→2",
    "Missing Value": "?",
    "Math Formula": "f(x)",
    "Row Sampler": "▦",
    "Generic ECharts View": "▤",
    "Table Creator": "▦",
    "Cross Joiner": "×",
    "Rule Engine": "✓",
    "GroupBy": "Σ",
    "Column Renamer": "A↔B",
}

COLORS = {
    "CSV Reader": "#ee8e1d",
    "Transfer Files": "#ee8e1d",
    "Table Creator": "#ee8e1d",
    "Generic ECharts View": "#138ca1",
    "Rule Engine": "#1f9f59",
}


def entries(config: ET.Element) -> dict[str, str]:
    return {el.get("key", ""): el.get("value", "") for el in config if el.tag.endswith("entry")}


def child_config(config: ET.Element, key: str) -> ET.Element:
    return next(el for el in config if el.tag.endswith("config") and el.get("key") == key)


class DescriptionText(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def node_description(settings: ET.Element) -> str:
    field = next((el for el in settings.iter()
                  if el.tag.endswith("entry") and el.get("key") == "customDescription"), None)
    if field is None or field.get("isnull") == "true":
        return ""
    raw = field.get("value", "")
    parser = DescriptionText()
    parser.feed(raw)
    return " ".join(" ".join(parser.parts).split())


def parse_workflow(path: Path) -> tuple[dict[int, dict], list[tuple[int, int]]]:
    with zipfile.ZipFile(path) as archive:
        workflow_name = next(name for name in archive.namelist() if name.endswith("/workflow.knime"))
        root = ET.fromstring(archive.read(workflow_name))
        prefix = workflow_name.removesuffix("workflow.knime")
        nodes: dict[int, dict] = {}
        for config in child_config(root, "nodes"):
            fields = entries(config)
            node_id = int(fields["id"])
            settings = ET.fromstring(archive.read(prefix + fields["node_settings_file"]))
            settings_fields = entries(settings)
            position = entries(child_config(child_config(config, "ui_settings"), "extrainfo.node.bounds"))
            nodes[node_id] = {
                "name": settings_fields["node-name"],
                "caption": node_description(settings),
                "x": int(position["0"]),
                "y": int(position["1"]),
            }
        connections = []
        for config in child_config(root, "connections"):
            fields = entries(config)
            connections.append((int(fields["sourceID"]), int(fields["destID"])))
    return nodes, connections


def layout(nodes: dict[int, dict]) -> dict[int, tuple[float, float]]:
    # Preserve KNIME's left-to-right order, with extra vertical room for captions.
    positions = {}
    for node_id, node in nodes.items():
        x = 225 + (node["x"] + 350) * 2.1
        if node_id == 31:
            y = 165
        elif node_id in (8, 9):
            y = 145
        elif node_id in (23, 25):
            y = 590 if node_id == 23 else 850
        elif node_id == 18:
            # Leave room for the Row Filter caption above this node title.
            y = 945
        elif node_id in (15, 16, 17, 19, 20, 21, 22, 24):
            y = 720
        elif node_id in (26, 27, 28, 29, 30):
            y = 1210
        else:
            y = 400
        positions[node_id] = (x, y)
    return positions


def label_lines(text: str, width: int = 23) -> list[str]:
    return textwrap.wrap(text, width=width, break_long_words=False, break_on_hyphens=False)


def main(source: Path) -> None:
    nodes, connections = parse_workflow(source)
    missing = set(nodes) - set(CAPTIONS)
    if missing:
        raise ValueError(f"Captions missing for node IDs: {sorted(missing)}")
    p = layout(nodes)
    width, height = 4700, 1460
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">',
        '<title id="title">Still On KNIME workflow</title>',
        '<desc id="desc">The October TV data is cleaned and projected at five viewing durations, then branched into a line chart, two standby charts, and a screen-size saving chart.</desc>',
        '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#48524b"/></marker></defs>',
        '<rect width="100%" height="100%" fill="#fffefb"/>',
        '<style>text{font-family:Arial,Helvetica,sans-serif}.lane{font-size:27px;font-weight:700;fill:#9b6a1e;letter-spacing:.1em}.node-name{font-size:16px;font-weight:700;fill:#26312b}.caption{font-size:16px;fill:#586258}.glyph{font-size:19px;font-weight:800;fill:#18221e}.status{fill:#58a95e;stroke:#cbd2c9;stroke-width:2}.connector{fill:none;stroke:#68736b;stroke-width:2.5;marker-end:url(#arrow)}.node-square{stroke:#39433c;stroke-width:1.3}</style>',
        '<text x="115" y="54" class="lane">STILL ON / KNIME WORKFLOW</text>',
        '<text x="180" y="315" class="lane">01 / CLEAN + PROJECT</text>',
        '<text x="1940" y="95" class="lane">02 / VIEWING HOURS</text>',
        '<text x="1940" y="620" class="lane">03 / STANDBY MODES</text>',
        '<text x="1940" y="1125" class="lane">04 / TWO-HOUR SAVING</text>',
    ]
    for source_id, dest_id in connections:
        sx, sy = p[source_id]
        dx, dy = p[dest_id]
        x1, x2 = sx + 34, dx - 34
        if abs(sy - dy) < 5:
            d = f"M{x1:.1f} {sy:.1f} L{x2:.1f} {dy:.1f}"
        else:
            bend = x1 + min(90, max(32, (x2 - x1) * .4))
            d = f"M{x1:.1f} {sy:.1f} C{bend:.1f} {sy:.1f}, {bend:.1f} {dy:.1f}, {x2:.1f} {dy:.1f}"
        parts.append(f'<path class="connector" d="{d}"/>')
    for node_id, node in nodes.items():
        x, y = p[node_id]
        name = node["name"]
        color = COLORS.get(name, "#efc821")
        glyph = GLYPHS.get(name, "•")
        parts.extend([
            f'<g id="node-{node_id}">',
            f'<text x="{x:.1f}" y="{y-48:.1f}" text-anchor="middle" class="node-name">{escape(name)}</text>',
            f'<rect x="{x-26:.1f}" y="{y-27:.1f}" width="52" height="52" rx="3" fill="{color}" class="node-square"/>',
            f'<text x="{x:.1f}" y="{y+7:.1f}" text-anchor="middle" class="glyph">{escape(glyph)}</text>',
            f'<circle cx="{x-13:.1f}" cy="{y+40:.1f}" r="5" fill="#f9f9f7" stroke="#cbd2c9" stroke-width="2"/>',
            f'<circle cx="{x:.1f}" cy="{y+40:.1f}" r="5" fill="#f9f9f7" stroke="#cbd2c9" stroke-width="2"/>',
            f'<circle cx="{x+13:.1f}" cy="{y+40:.1f}" r="5" class="status"/>',
        ])
        for line_no, line in enumerate(label_lines(node["caption"] or CAPTIONS[node_id])):
            parts.append(f'<text x="{x:.1f}" y="{y+74+line_no*22:.1f}" text-anchor="middle" class="caption">{escape(line)}</text>')
        parts.append('</g>')
    parts.append('</svg>')
    destination = Path(__file__).resolve().parents[1] / "assets" / "img" / "knime-workflow.svg"
    destination.write_text("\n".join(parts), encoding="utf-8")
    print(f"Rendered {len(nodes)} nodes and {len(connections)} connections to {destination}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Expected path to a .knwf file")
    main(Path(sys.argv[1]))
