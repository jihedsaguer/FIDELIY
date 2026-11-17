#!/bin/bash
# Graphify refresh workflow for FIDELIY
# Run this to update the knowledge graph after code changes

set -e

echo "Refreshing FIDELIY knowledge graph..."

# Navigate to project root
cd "$(dirname "$0")/.."

# Check if graphify is available
if ! command -v graphify &> /dev/null; then
    echo "ERROR: graphify not found. Please install with: uv pip install graphifyy --system"
    exit 1
fi

# Incremental update - only re-extract changed files
echo "Running incremental graph update..."
graphify . --code-only --update --no-viz

# Check if graph was updated
if [ -f "graphify-out/graph.json" ]; then
    echo "Graph updated successfully."
    # Use python to count nodes and edges if jq is not available
    if command -v jq &> /dev/null; then
        echo "Nodes: $(jq '.nodes | length' graphify-out/graph.json)"
        echo "Edges: $(jq '.edges | length' graphify-out/graph.json)"
    else
        echo "Nodes and edges updated (use jq or python to count)"
    fi
else
    echo "ERROR: graph.json not found after update"
    exit 1
fi

echo "Graph refresh complete!"
