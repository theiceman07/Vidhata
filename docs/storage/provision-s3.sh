#!/usr/bin/env bash
# Creates and hardens the Vidhata files bucket in Mumbai (ap-south-1).
# Usage: bash docs/storage/provision-s3.sh <bucket-name>
# Requires AWS CLI v2 with admin credentials for the target account.
set -euo pipefail

BUCKET="${1:?usage: provision-s3.sh <bucket-name>}"
REGION="ap-south-1"
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "Creating bucket $BUCKET in $REGION"
aws s3api create-bucket \
  --bucket "$BUCKET" \
  --region "$REGION" \
  --create-bucket-configuration "LocationConstraint=$REGION"

aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws s3api put-bucket-ownership-controls --bucket "$BUCKET" \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'

aws s3api put-bucket-versioning --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption --bucket "$BUCKET" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}'

aws s3api put-bucket-cors --bucket "$BUCKET" \
  --cors-configuration "file://$HERE/cors.json"

# Substitute the bucket name into the TLS-only policy, then apply it.
POLICY_FILE="$(mktemp)"
trap 'rm -f "$POLICY_FILE"' EXIT
sed "s/BUCKET_NAME/$BUCKET/g" "$HERE/bucket-policy.json" > "$POLICY_FILE"
aws s3api put-bucket-policy --bucket "$BUCKET" --policy "file://$POLICY_FILE"

echo "Done. Next: attach app-iam-policy.json to the backend role (replace BUCKET_NAME)."
