# File storage: S3 setup (Week 10, backend track)

Source: `AgentClause_Build_Plan_Week9-18.docx`, Week 10 backend track ("Set up S3 or Cloudflare R2 bucket with signed URL generation for file uploads"). Architecture: `AgentClause_Technical_Architecture_final.docx` §5.

## Decision: AWS S3 in Mumbai (`ap-south-1`)

- Architecture §5.16 requires an India region from day one for DPDP data residency. S3 has `ap-south-1`. R2 has no India location (its location hints are regional, e.g. APAC), so it does not meet that requirement.
- The code uses the S3 API. Switching to R2 later means changing the endpoint URL and keys, not the code.
- Files are private. Uploads and downloads go through short-lived presigned URLs. Nothing is public.

## What is in this folder

| File | Purpose |
| --- | --- |
| `provision-s3.sh` | Creates the bucket with the required settings (run once per environment, with AWS CLI v2 and admin credentials). |
| `cors.json` | Lets the browser POST uploads directly to the bucket from the app origin. |
| `bucket-policy.json` | Denies any non-TLS request. Replace `BUCKET_NAME`. |
| `app-iam-policy.json` | Least-privilege policy for the backend's runtime role. Put/Get on `orgs/*` only, no delete. |
| `s3_presign.py` | Reference FastAPI helper: builds presigned upload (POST) and download (GET) URLs. |

## Bucket settings (enforced by `provision-s3.sh`)

- Block Public Access: all four settings on.
- Object ownership: BucketOwnerEnforced (ACLs disabled).
- Default encryption: SSE-S3 (AES256) with bucket keys. Move to SSE-KMS if counsel requires customer-managed keys.
- Versioning: on, so an overwritten or deleted evidence file can be recovered.
- No lifecycle expiry. How long documents are retained is an open question for counsel, so nothing is auto-deleted.

## Key layout

`orgs/{org_id}/documents/{document_id}/{uuid}/{sanitised-stem}.{ext}`

- The original filename is stored in the database. It is never used as the key, so client input cannot choose a path.
- `org_id` is the first segment so IAM and audits can scope by organisation.

## URL rules

- Upload: presigned POST, valid 5 minutes, with a content-type condition and a size range (max 25 MB). Allowed types: PDF, DOCX, PNG, JPEG.
- Download: presigned GET, valid 5 minutes, `Content-Disposition: attachment`.
- The backend checks authorisation (role, organisation, document state) before issuing any URL. The key always comes from the database row, never from the request.
- Presigned URLs are never written to logs or to browser storage.

## Setup steps

1. Create an AWS account (or use the team's). Install AWS CLI v2. Log in with an admin profile.
2. `bash docs/storage/provision-s3.sh vidhata-<env>-files-<account-id>` (bucket names are global, so include the account ID).
3. The script fills `BUCKET_NAME` in `bucket-policy.json` itself, so no manual edit is needed for that file.
4. Create an IAM role or user for the backend and attach `app-iam-policy.json` (replace `BUCKET_NAME`).
5. Set these environment variables on the backend (never in the frontend, never committed):

```
AWS_REGION=ap-south-1
S3_BUCKET=vidhata-<env>-files-<account-id>
AWS_ACCESS_KEY_ID=...        # or use the platform's IAM role instead
AWS_SECRET_ACCESS_KEY=...
```

6. Local test: upload a small PDF through `create_upload`, PUT the file with the returned fields, then fetch it with `create_download`. Confirm an expired URL is refused and a wrong-type file is refused.

## Not done here

- No bucket or IAM role has been created. Those need the team's AWS account and admin access.
- The frontend still keeps only the file name (`attachEvidence`, `lib/api/documents.ts`). Wiring it to the presign endpoints is a backend-integration task, tracked in `docs/backend-handover-checklist.md`.
- Malware scanning of uploads is not included. Add it before any client can download files from another client's upload.
