"""
Content parsing service — extracts text from uploaded files.

Supports: PDF (via PyMuPDF), PPTX, DOCX.
Audio/video transcription handled separately via faster-whisper.
"""

import asyncio
from pathlib import Path

import fitz  # PyMuPDF
from docx import Document as DocxDocument
from pptx import Presentation


async def parse_pdf(file_path: Path) -> list[dict]:
    """Extract text and images from a PDF file.

    Returns a list of page dicts: [{"page": 1, "text": "...", "images": [...]}]
    """

    def _extract() -> list[dict]:
        pages: list[dict] = []
        with fitz.open(file_path) as doc:
            for page_num, page in enumerate(doc, start=1):
                text = page.get_text("text")

                # For scanned pages (very little text), try OCR via PyMuPDF's built-in textpage
                if len(text.strip()) < 20:
                    text = page.get_text("text", flags=fitz.TEXT_PRESERVE_WHITESPACE)

                image_list = page.get_images(full=True)
                images: list[dict] = []
                for img_index, img_info in enumerate(image_list):
                    xref = img_info[0]
                    base_image = doc.extract_image(xref)
                    if base_image:
                        images.append(
                            {
                                "index": img_index,
                                "width": base_image.get("width", 0),
                                "height": base_image.get("height", 0),
                                "ext": base_image.get("ext", "png"),
                                "size": len(base_image.get("image", b"")),
                            }
                        )

                pages.append({"page": page_num, "text": text.strip(), "images": images})
        return pages

    return await asyncio.to_thread(_extract)


async def parse_pptx(file_path: Path) -> list[dict]:
    """Extract text from PPTX slides."""

    def _extract() -> list[dict]:
        prs = Presentation(str(file_path))
        slides: list[dict] = []
        for slide_num, slide in enumerate(prs.slides, start=1):
            texts: list[str] = []
            for shape in slide.shapes:
                if shape.has_text_frame:
                    for paragraph in shape.text_frame.paragraphs:
                        para_text = paragraph.text.strip()
                        if para_text:
                            texts.append(para_text)

            notes_text = ""
            if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
                notes_text = slide.notes_slide.notes_text_frame.text.strip()

            slides.append(
                {
                    "page": slide_num,
                    "text": "\n".join(texts),
                    "notes": notes_text,
                    "images": [],
                }
            )
        return slides

    return await asyncio.to_thread(_extract)


async def parse_docx(file_path: Path) -> list[dict]:
    """Extract text from DOCX documents."""

    def _extract() -> list[dict]:
        doc = DocxDocument(str(file_path))
        sections: list[dict] = []
        current_section: dict = {"page": 1, "text": "", "images": []}
        paragraphs: list[str] = []

        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue

            # Start a new section on headings
            if para.style and para.style.name and para.style.name.startswith("Heading"):
                if paragraphs:
                    current_section["text"] = "\n".join(paragraphs)
                    sections.append(current_section)
                    current_section = {
                        "page": len(sections) + 1,
                        "text": "",
                        "images": [],
                    }
                    paragraphs = []

            paragraphs.append(text)

        # Append remaining content
        if paragraphs:
            current_section["text"] = "\n".join(paragraphs)
            sections.append(current_section)

        # Also extract tables
        for table_idx, table in enumerate(doc.tables):
            rows_text: list[str] = []
            for row in table.rows:
                cells = [cell.text.strip() for cell in row.cells]
                rows_text.append(" | ".join(cells))
            if rows_text:
                sections.append(
                    {
                        "page": len(sections) + 1,
                        "text": f"[Table {table_idx + 1}]\n" + "\n".join(rows_text),
                        "images": [],
                    }
                )

        return sections if sections else [{"page": 1, "text": "", "images": []}]

    return await asyncio.to_thread(_extract)


async def parse_file(file_path: Path) -> list[dict]:
    """Parse a file based on its extension."""
    suffix = file_path.suffix.lower()
    parsers = {
        ".pdf": parse_pdf,
        ".pptx": parse_pptx,
        ".docx": parse_docx,
    }
    parser = parsers.get(suffix)
    if parser is None:
        raise ValueError(f"Unsupported file type: {suffix}")
    return await parser(file_path)
