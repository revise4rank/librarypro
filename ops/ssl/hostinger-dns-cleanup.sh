#!/bin/sh
set -eu

# Hostinger renewals overwrite the ACME TXT value on the next auth hook run.
# Keeping the last value is harmless and avoids deleting a record while DNS is still propagating.
exit 0

