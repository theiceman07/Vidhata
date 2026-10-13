"""Presigned upload and download URLs for Vidhata document files (S3, ap-south-1).

Reference implementation for the FastAPI backend. Authorisation is the caller's
job: check role, organisation and document state BEFORE calling these helpers.
The storage key must come from the database row, never from request input.
"""
import os
import re
import uuid

import boto3
from botocore.config import Config

BUCKET = os.environ["S3_BUCKET"]
REGION = os.environ.get("AWS_REGION", "ap-south-1")

UPLOAD_TTL_SECONDS = 300
DOWNLOAD_TTL_SECONDS = 300
MAX_UPLOAD_BYTES = 25 * 1024 * 1024

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "image/png": "png",
    "image/jpeg": "jpg",
}

_UNSAFE = re.compile(r"[^A-Za-z0-9._-]+")

_s3 = boto3.client(
    "s3",
    region_name=REGION,
    endpoint_url=f"https://s3.{REGION}.amazonaws.com",
    config=Config(signature_version="s3v4", retries={"max_attempts": 3, "mode": "standard"}),
)


def _safe_stem(filename: str) -> str:
    stem = os.path.splitext(os.path.basename(filename))[0]
    return _UNSAFE.sub("_", stem)[:80].strip("._") or "file"


def object_key(org_id: str, document_id: str, filename: str, content_type: str) -> str:
    ext = ALLOWED_TYPES[content_type]
    return f"orgs/{org_id}/documents/{document_id}/{uuid.uuid4()}/{_safe_stem(filename)}.{ext}"


def create_upload(org_id: str, document_id: str, filename: str, content_type: str, size: int) -> dict:
    """Return a presigned POST. The browser posts the file with the returned fields.

    The policy enforces the content type and a size range, so S3 refuses
    anything else even if the client lies about its request.
    """
    if content_type not in ALLOWED_TYPES:
        raise ValueError("File type not allowed.")
    if not 0 < size <= MAX_UPLOAD_BYTES:
        raise ValueError("File is empty or larger than 25 MB.")

    key = object_key(org_id, document_id, filename, content_type)
    post = _s3.generate_presigned_post(
        Bucket=BUCKET,
        Key=key,
        Fields={"Content-Type": content_type},
        Conditions=[
            {"Content-Type": content_type},
            ["content-length-range", 1, MAX_UPLOAD_BYTES],
        ],
        ExpiresIn=UPLOAD_TTL_SECONDS,
    )
    return {"key": key, "url": post["url"], "fields": post["fields"]}


def create_download(key: str, filename: str) -> str:
    """Return a short-lived GET URL that downloads the file as an attachment.

    `key` must be read from the database for a document the caller may see.
    """
    safe_name = _safe_stem(filename) + os.path.splitext(filename)[1].lower()
    return _s3.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": BUCKET,
            "Key": key,
            "ResponseContentDisposition": f'attachment; filename="{safe_name}"',
        },
        ExpiresIn=DOWNLOAD_TTL_SECONDS,
    )
