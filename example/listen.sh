touch traces.json
docker run \
  -v $(pwd)/config.yaml:/etc/otelcol-contrib/config.yaml \
  -v $(pwd)/traces.json:/traces.json \
  -p 4317:4317 \
  -p 4318:4318 \
  otel/opentelemetry-collector-contrib:0.118.0