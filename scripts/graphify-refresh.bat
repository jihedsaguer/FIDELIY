@echo off
setlocal

echo Refreshing FIDELIY knowledge graph...

REM Navigate to project root
cd /d %~dp0..

REM Check if graphify is available
where graphify > nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: graphify not found. Please install with: uv pip install graphifyy --system
    exit /b 1
)

REM Incremental update - only re-extract changed files
echo Running incremental graph update...
graphify . --code-only --update --no-viz

REM Check if graph was updated
if exist graphify-out\graph.json (
    echo Graph updated successfully.
    for /f "usebackq delims=:" %%i in (`jq ".nodes | length" graphify-out\graph.json`) do set NODES=%%i
    for /f "usebackq delims=:" %%i in (`jq ".edges | length" graphify-out\graph.json`) do set EDGES=%%i
    echo Nodes: %NODES%
    echo Edges: %EDGES%
) else (
    echo ERROR: graph.json not found after update
    exit /b 1
)

echo Graph refresh complete!
