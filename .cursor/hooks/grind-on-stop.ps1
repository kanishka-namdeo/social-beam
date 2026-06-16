# grind-on-stop.ps1
# Stop hook that keeps the agent working until verification passes
# Inspired by Cursor's official grind pattern

param(
    [Parameter(Mandatory=$false)]
    [string]$InputJson
)

# Read input from stdin if not provided as parameter
if (-not $InputJson) {
    $InputJson = $input | Out-String
}

# Parse input
$inputObj = $InputJson | ConvertFrom-Json

$convoId = $inputObj.conversation_id
$status = $inputObj.status
$loopCount = $inputObj.loop_count

# Configuration
$MAX_ITERATIONS = 5
$SCRATCHPAD_PATH = ".cursor/scratchpad.md"

# If not completed or max iterations reached, stop the loop
if ($status -ne "completed" -or $loopCount -ge $MAX_ITERATIONS) {
    Write-Output "{}"
    exit 0
}

# Check if scratchpad exists and contains DONE marker
if (Test-Path $SCRATCHPAD_PATH) {
    $scratchpadContent = Get-Content $SCRATCHPAD_PATH -Raw
    if ($scratchpadContent -match "DONE") {
        # Agent marked itself as done, stop the loop
        Write-Output "{}"
        exit 0
    }
}

# Otherwise, continue the loop with a followup message
$followup = @{
    followup_message = "[Iteration $($loopCount + 1)/$MAX_ITERATIONS] Continue working on verification. Run typecheck, lint, and build. Fix any failures. Update .cursor/scratchpad.md with 'DONE' when all checks pass."
}

$followup | ConvertTo-Json -Compress | Write-Output
