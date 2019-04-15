#!/bin/bash
RESULT=$(curl http://localhost:8081/health)

if [[ "$RESULT" =~ "OK" ]]; then
  echo "SUCCESS"
  exit 0
else
  echo "FAIL"
  exit 1
fi
