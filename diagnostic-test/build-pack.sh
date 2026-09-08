#!/bin/sh
# The folder is the source of truth; the zip is generated from it.
# The answer key lives one level up and can never be swept into the pack.
set -e
cd "$(dirname "$0")"
rm -f NORTHREACH-diagnostic-pack.zip
zip -qr NORTHREACH-diagnostic-pack.zip northreach
echo "built NORTHREACH-diagnostic-pack.zip from northreach/ — $(unzip -l NORTHREACH-diagnostic-pack.zip | tail -1 | awk '{print $2}') entries"
python3 verify-pack.py
