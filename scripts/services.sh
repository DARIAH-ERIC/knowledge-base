#!/bin/sh

set -eu

DEVCONTAINER_DIR="./.devcontainer"
ENV_FILE="$DEVCONTAINER_DIR/.env"

if [ $# -lt 1 ]; then
	echo "Usage: $0 <start|stop> [service1 service2 ...]"
	exit 1
fi

ACTION=$1
shift

ALL_SERVICES=""
for file in "$DEVCONTAINER_DIR"/docker-compose.*.yaml; do
	name=${file##*/}
	service=${name#docker-compose.}
	service=${service%.yaml}
	ALL_SERVICES="$ALL_SERVICES $service"
done

if [ $# -eq 0 ]; then
	SERVICES="$ALL_SERVICES"
else
	SERVICES="$*"
fi

FILES=""
for service in $SERVICES; do
	file="$DEVCONTAINER_DIR/docker-compose.$service.yaml"
	if [ ! -f "$file" ]; then
		echo "Unknown service: $service"
		exit 1
	fi
	FILES="$FILES --file $file"
done

case "$ACTION" in
	start)
		echo "Starting services: $SERVICES"
		eval docker compose --env-file "\"$ENV_FILE\"" $FILES up --detach
		;;
	stop)
		echo "Stopping services: $SERVICES"
		eval docker compose --env-file "\"$ENV_FILE\"" $FILES down --volumes
		;;
	*)
		echo "Unknown action: $ACTION. Use 'start' or 'stop'."
		exit 1
		;;
esac

echo "Done."
