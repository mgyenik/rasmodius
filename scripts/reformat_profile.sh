#!/bin/bash
# Reformats poorly formatted profiler output into a clean table
#
# Input format (every 4 lines = 1 record, but some have 3 or empty file loc):
#   self_time + self_%
#   total_time + total_%
#   function_name
#   file:line:col (optional/may be empty)
#
# Output format:
#   total_time | total_% | function_name | file:line:col

input_file="${1:-/dev/stdin}"

# Pattern to detect stat lines (e.g., "8,731.1 ms99.9 %")
is_stat_line() {
    [[ "$1" =~ ^[0-9,]+\.[0-9]+\ ms[0-9]+\.[0-9]+\ %$ ]]
}

# Read all lines into array
mapfile -t lines < "$input_file"
total=${#lines[@]}
i=0

while (( i < total )); do
    line1="${lines[i]}"

    # Skip blank lines between records
    if [[ -z "$line1" ]]; then
        ((i++))
        continue
    fi

    # Verify this looks like a stat line to start a record
    if ! is_stat_line "$line1"; then
        ((i++))
        continue
    fi

    line2="${lines[i+1]}"
    func_name="${lines[i+2]}"
    file_loc="${lines[i+3]:-}"

    # Check if file_loc is actually the next record's stat line
    if is_stat_line "$file_loc"; then
        # 3-line record - no file location
        file_loc=""
        ((i += 3))
    else
        # 4-line record (file_loc may be empty string, that's ok)
        ((i += 4))
    fi

    # Parse line2: "8,731.1 ms99.9 %" -> time="8,731.1 ms", pct="99.9 %"
    time_part="${line2%%ms*}ms"
    pct_part="${line2#*ms}"

    # Print formatted output
    printf "%s | %s | %s | %s\n" "$time_part" "$pct_part" "$func_name" "$file_loc"
done
