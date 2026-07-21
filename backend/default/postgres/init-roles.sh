#!/bin/sh
set -eu

if [ "${#DAMAT_MIGRATOR_PASSWORD}" -lt 32 ] ||
  [ "${#DAMAT_RUNTIME_PASSWORD}" -lt 32 ] ||
  [ "${#DAMAT_BACKUP_PASSWORD}" -lt 32 ]; then
  echo "Damat PostgreSQL role passwords must be at least 32 characters" >&2
  exit 1
fi

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=migrator_password="$DAMAT_MIGRATOR_PASSWORD" \
  --set=runtime_password="$DAMAT_RUNTIME_PASSWORD" \
  --set=backup_password="$DAMAT_BACKUP_PASSWORD" <<-'SQL'
	CREATE ROLE damat_migrator LOGIN PASSWORD :'migrator_password'
	  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
	CREATE ROLE damat_runtime LOGIN PASSWORD :'runtime_password'
	  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
	CREATE ROLE damat_backup LOGIN PASSWORD :'backup_password'
	  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
	ALTER DATABASE damatjs OWNER TO damat_migrator;
	REVOKE CREATE ON SCHEMA public FROM PUBLIC;
	GRANT CONNECT ON DATABASE damatjs TO damat_runtime, damat_backup;
	GRANT USAGE ON SCHEMA public TO damat_runtime, damat_backup;
	GRANT pg_read_all_data TO damat_backup;
	ALTER DEFAULT PRIVILEGES FOR ROLE damat_migrator IN SCHEMA public
	  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO damat_runtime;
	ALTER DEFAULT PRIVILEGES FOR ROLE damat_migrator IN SCHEMA public
	  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO damat_runtime;
	ALTER DEFAULT PRIVILEGES FOR ROLE damat_migrator IN SCHEMA public
	  GRANT EXECUTE ON FUNCTIONS TO damat_runtime;
SQL
