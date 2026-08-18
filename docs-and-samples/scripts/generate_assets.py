#!/usr/bin/env python3
"""Generate extension icons and the sample Excel/CSV test workbook."""

from __future__ import annotations

import csv
import struct
import zlib
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

REPO = Path(__file__).resolve().parent.parent.parent
ICONS = REPO / "chrome-extension" / "icons"
SAMPLE = REPO / "docs-and-samples" / "sample-data"

HEADERS = [
    "Scenario",
    "Username",
    "Password",
    "Email",
    "Phone",
    "First Name",
    "Last Name",
    "Address",
    "City",
    "PIN",
    "Card Number",
    "Expiry",
    "CVV",
]

ROWS = [
    [
        "Valid login",
        "qa.user.01",
        "Test@12345",
        "qa.user.01@example.test",
        "9876543210",
        "Asha",
        "Verma",
        "14 MG Road",
        "Bengaluru",
        "560001",
        "4111111111111111",
        "12/28",
        "123",
    ],
    [
        "Invalid password",
        "qa.user.01",
        "WrongPass!",
        "qa.user.01@example.test",
        "9876543210",
        "Asha",
        "Verma",
        "14 MG Road",
        "Bengaluru",
        "560001",
        "4111111111111111",
        "12/28",
        "123",
    ],
    [
        "New registration",
        "qa.new.user",
        "Welcome@2026",
        "qa.new.user@example.test",
        "9123456780",
        "Rohan",
        "Mehta",
        "88 Park Street",
        "Kolkata",
        "700016",
        "5555555555554444",
        "03/29",
        "456",
    ],
    [
        "Missing phone",
        "qa.nophone",
        "PhoneLess#1",
        "qa.nophone@example.test",
        "",
        "Neha",
        "Kapoor",
        "5 Residency Road",
        "Pune",
        "411001",
        "4000000000000002",
        "08/27",
        "789",
    ],
    [
        "International address",
        "qa.intl.user",
        "Travel@987",
        "qa.intl.user@example.test",
        "+44 7700 900123",
        "James",
        "Wright",
        "221B Baker Street",
        "London",
        "NW1 6XE",
        "4012888888881881",
        "11/30",
        "321",
    ],
]


def png_chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path: Path, size: int, pixels: list[tuple[int, int, int, int]]) -> None:
    raw = b"".join(b"\x00" + b"".join(struct.pack("BBBB", *px) for px in row) for row in chunked(pixels, size))
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", ihdr) + png_chunk(b"IDAT", zlib.compress(raw, 9)) + png_chunk(b"IEND", b"")
    path.write_bytes(png)


def chunked(items: list, size: int) -> list[list]:
    return [items[i : i + size] for i in range(0, len(items), size)]


def icon_pixels(size: int) -> list[tuple[int, int, int, int]]:
    bg = (37, 99, 235, 255)
    fg = (255, 255, 255, 255)
    line = (29, 78, 216, 255)
    header = (219, 234, 254, 255)
    pixels = []
    pad = max(2, size // 8)
    inner = size - pad * 2
    row_h = max(2, inner // 4)
    col_w = max(2, inner // 3)
    for y in range(size):
        for x in range(size):
            color = bg
            if pad <= x < size - pad and pad <= y < size - pad:
                color = fg
                lx = x - pad
                ly = y - pad
                if lx % col_w == 0 or ly % row_h == 0 or lx == inner - 1 or ly == inner - 1:
                    color = line
                if ly < row_h:
                    color = header if color == fg else line
            pixels.append(color)
    return pixels


def col_name(index: int) -> str:
    name = ""
    n = index + 1
    while n:
        n, rem = divmod(n - 1, 26)
        name = chr(65 + rem) + name
    return name


def cell_xml(row: int, col: int, value: str) -> str:
    ref = f"{col_name(col)}{row}"
    text = escape(value, {"'": "&apos;", '"': "&quot;"})
    return f'<c r="{ref}" t="inlineStr"><is><t xml:space="preserve">{text}</t></is></c>'


def sheet_xml(headers: list[str], rows: list[list[str]]) -> str:
    xml_rows = []
    all_rows = [headers, *rows]
    for r_index, row in enumerate(all_rows, start=1):
        cells = "".join(cell_xml(r_index, c_index, value) for c_index, value in enumerate(row))
        xml_rows.append(f'<row r="{r_index}">{cells}</row>')
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f"<sheetData>{''.join(xml_rows)}</sheetData></worksheet>"
    )


def write_xlsx(path: Path) -> None:
    files = {
        "[Content_Types].xml": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>
""",
        "_rels/.rels": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>
""",
        "xl/workbook.xml": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Test Data" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>
""",
        "xl/_rels/workbook.xml.rels": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
""",
        "xl/styles.xml": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>
""",
        "xl/worksheets/sheet1.xml": sheet_xml(HEADERS, ROWS),
    }
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for name, content in files.items():
            zf.writestr(name, content.strip() if name != "xl/worksheets/sheet1.xml" else content)


def write_csv(path: Path) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(HEADERS)
        writer.writerows(ROWS)


def main() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    SAMPLE.mkdir(parents=True, exist_ok=True)
    for size in (16, 48, 128):
        write_png(ICONS / f"icon{size}.png", size, icon_pixels(size))
    write_csv(SAMPLE / "handy-test-data.csv")
    write_xlsx(SAMPLE / "handy-test-data.xlsx")
    print("Generated icons and sample test data.")


if __name__ == "__main__":
    main()
