#!/bin/sh

set -eu

echo "Creating pods..."

kubectl -n dariah-knowledge-base apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: pg-proxy
spec:
  containers:
  - name: socat
    image: alpine/socat
    command: ["socat", "TCP-LISTEN:5432,fork", "TCP:acdh-ch-ha-postgres-cluster-pgbouncer.postgres-cluster.svc:5432"]
EOF

kubectl -n dariah-knowledge-base apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: s3-proxy
spec:
  containers:
  - name: socat
    image: alpine/socat
    command: ["socat", "TCP-LISTEN:8080,fork", "TCP:s3-loadbalancer.s3-gateway.svc:8080"]
EOF

cleanup() {
  echo "Stopping port-forwards..."
  kill "$pid1" "$pid2" 2>/dev/null
}

echo "Starting port-forwards..."

trap cleanup EXIT INT TERM

kubectl -n dariah-knowledge-base port-forward pod/pg-proxy 5432:5432 &
pid1=$!

kubectl -n dariah-knowledge-base port-forward pod/s3-proxy 8080:8080 &
pid2=$!

wait
