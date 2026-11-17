#!/bin/bash
# Full Graphify rebuild for FIDELIY
# Run this when you need a complete graph rebuild

set -e

echo "Rebuilding FIDELIY knowledge graph from scratch..."

cd "$(dirname "$0")/.."

if ! command -v graphify &> /dev/null; then
    echo "ERROR: graphify not found."
    exit 1
fi

# Full rebuild
graphify . --code-only --force --no-viz

if [ -f "graphify-out/graph.json" ]; then
    echo "Full rebuild complete."
    echo "Nodes: $(jq '.nodes | length' graphify-out/graph.json)"
    echo "Edges: $(jq '.edges | length' graphify-out/graph.json)"
else
    echo "ERROR: rebuild failed"
    exit 1
fi
