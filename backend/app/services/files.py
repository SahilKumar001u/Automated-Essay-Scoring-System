"""Input sanitising and text extraction from uploaded .txt / .pdf / .docx files."""
import io
import re
from pathlib import Path

from fastapi import HTTPException, UploadFile

from ..config import settings

ALLOWED = {".txt", ".pdf", ".docx"}
_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def clean_text(text: str) -> str:
    """Drop control characters (incl. NUL, which PostgreSQL rejects) and normalise newlines."""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return _CONTROL.sub("", text).strip()


async def extract_text(file: UploadFile) -> str:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED:
        raise HTTPException(415, "Unsupported file type. Upload a .txt, .pdf or .docx file")
    data = await file.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(413, f"File is too large (maximum {settings.max_upload_bytes // 1_000_000} MB)")
    try:
        if ext == ".txt":
            text = data.decode("utf-8")
        elif ext == ".pdf":
            from pypdf import PdfReader

            text = "\n\n".join(page.extract_text() or "" for page in PdfReader(io.BytesIO(data)).pages)
        else:
            from docx import Document

            text = "\n\n".join(p.text for p in Document(io.BytesIO(data)).paragraphs if p.text.strip())
    except Exception:
        # the extension is only a claim; a file that doesn't parse as its type is rejected here
        raise HTTPException(400, f"Could not read this {ext} file. Make sure it is a valid, text-based document")
    return clean_text(text)
