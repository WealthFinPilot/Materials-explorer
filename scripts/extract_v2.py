#!/usr/bin/env python3
"""extract_v2.py — single entry point for V2 xlsx -> JSON extraction.

Reads V2_project.xlsx (sheets `Add` and `Requis`) and produces:
  - data/fe01_requis.json / data/fe30_requis.json   (compliance requirements)
  - merges new `Add` grades into data/fe01.json / data/fe30.json (similarity DB)
    and backfills `shape` / `type` on existing V1 entries.

Idempotent: re-running does not duplicate `Add` entries (dedup by `std`).
Never invents composition values — all numbers come from the workbook.
"""
import json
import re
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "V2_project.xlsx"
DATA = ROOT / "data"

# xlsx columns B..K (1-indexed positions 1..10), in source order.
SRC_ELEMENTS = ["C", "Mn", "P", "S", "Si", "Ni", "Cr", "Mo", "V", "Cu"]
EN_DASH = "–"


def num_to_str(v):
    """Shortest faithful decimal string for a numeric cell."""
    if isinstance(v, int):
        return str(v)
    s = ("%f" % v).rstrip("0").rstrip(".")
    return s or "0"


def designation(grade):
    return str(grade).strip()


def make_std(grade, silo):
    """Display name. Fe01 grades are AISI numbers; Fe30 are UNS/AISI/named."""
    d = designation(grade)
    return f"AISI {d}" if silo == "fe01" else d


def parse_shape(cell):
    if not cell:
        return []
    return [p.strip() for p in str(cell).split(",") if p.strip()]


def comp_value(v):
    """Add-sheet composition cell -> float or None (representative value)."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).lower().replace("min", "").replace("max", "").replace(EN_DASH, "-").strip()
    m = re.match(r"-?\d*\.?\d+", s)
    return float(m.group(0)) if m else None


def req_value(v):
    """Requis-sheet cell -> raw string (parsed at runtime). Empty => no constraint."""
    if v is None:
        return ""
    if isinstance(v, (int, float)):
        return num_to_str(v)
    return str(v).strip()


def read_rows(ws):
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    return [r for r in rows if r and r[0] is not None]


def build():
    wb = openpyxl.load_workbook(SRC, data_only=True)
    add_ws, req_ws = wb["Add"], wb["Requis"]

    # --- Requis -> per-silo compliance datasets ---
    requis = {"fe01": [], "fe30": []}
    for r in read_rows(req_ws):
        silo = str(r[13]).lower()
        if silo not in requis:
            continue
        requirements = {el: req_value(r[i + 1]) for i, el in enumerate(SRC_ELEMENTS)}
        requis[silo].append({
            "std": make_std(r[0], silo),
            "grade": designation(r[0]),
            "shape": parse_shape(r[11]),
            "type": str(r[12] or "").strip(),
            "nb_requis": int(r[14]),
            "requirements": requirements,
        })

    # --- Add -> new alloy entries for the similarity DB ---
    add = {"fe01": [], "fe30": []}
    for r in read_rows(add_ws):
        silo = str(r[13]).lower()
        if silo not in add:
            continue
        comp = {el: comp_value(r[i + 1]) for i, el in enumerate(SRC_ELEMENTS)}
        add[silo].append({
            "std": make_std(r[0], silo),
            "grade": designation(r[0]),
            "shape": parse_shape(r[11]),
            "type": str(r[12] or "").strip(),
            "composition": comp,
        })

    for silo in ("fe01", "fe30"):
        # write requis file
        out = DATA / f"{silo}_requis.json"
        out.write_text(json.dumps(requis[silo], ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  {out.name}: {len(requis[silo])} grades")

        # merge add entries into the silo DB
        db_path = DATA / f"{silo}.json"
        db = json.loads(db_path.read_text(encoding="utf-8"))
        elements = db["elements"]

        existing_std = {a["std"] for a in db["alloys"]}
        # backfill shape/type on V1 entries
        for a in db["alloys"]:
            a.setdefault("shape", [])
            a.setdefault("type", "")

        added = 0
        for entry in add[silo]:
            if entry["std"] in existing_std:
                continue
            # full element vector: source elements + null for the rest
            composition = {el: entry["composition"].get(el) for el in elements}
            db["alloys"].append({
                "std": entry["std"],
                "grade": entry["grade"],
                "shape": entry["shape"],
                "type": entry["type"],
                "composition": composition,
            })
            existing_std.add(entry["std"])
            added += 1

        db_path.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  {db_path.name}: +{added} added, {len(db['alloys'])} total alloys")


if __name__ == "__main__":
    build()
    print("done.")
