#!/bin/sh
set -eu

if [ "${#REDIS_PASSWORD}" -lt 32 ]; then
  echo "REDIS_PASSWORD must be at least 32 characters" >&2
  exit 1
fi

case "$REDIS_PASSWORD" in
  *[!A-Za-z0-9_-]*)
    echo "REDIS_PASSWORD must use base64url-safe characters" >&2
    exit 1
    ;;
esac

umask 077
acl_file=/tmp/damat-users.acl
printf '%s\n' 'user default off' > "$acl_file"
printf 'user damat on >%s ~* &damat:* &damat-events +@all -@admin -@dangerous +eval +evalsha +scan\n' \
  "$REDIS_PASSWORD" >> "$acl_file"
exec redis-server --appendonly yes --aclfile "$acl_file"
