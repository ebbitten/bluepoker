#!/bin/bash

# BULLETPROOF Bash Pattern Validator
# Scans for forbidden patterns that trigger permission prompts
# Usage: ./scripts/validate-bash-patterns.sh [file_or_command]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create temp directory
TEMP_DIR="/tmp/bash-validator-$$"
mkdir -p "$TEMP_DIR"

# Cleanup function
cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Define forbidden patterns
FORBIDDEN_PATTERNS=(
    '\$\('                    # Command substitution $(...)
    '`'                       # Backticks for command substitution
    ' \| '                    # Pipe operator (with spaces)
    '\|[a-zA-Z]'             # Pipe to command (like |jq, |grep)
    ' && '                    # Command chaining AND
    ' \|\| '                  # Command chaining OR
    ' ; '                     # Command separator
    ' > '                     # Output redirect
    ' >> '                    # Append redirect
    ' < '                     # Input redirect
    'jq '                     # JSON processor usage
    'grep.*\|'               # Grep with pipe
    'curl.*-d.*\$'           # curl with variable data
    'VAR='                   # Variable assignment
    'export '                # Environment variable export
    'echo \$'                # Variable expansion in echo
)

# Pattern descriptions
PATTERN_DESCRIPTIONS=(
    "Command substitution \$()"
    "Backtick command substitution"
    "Pipe operator"
    "Pipe to command"
    "Command chaining (AND)"
    "Command chaining (OR)"
    "Command separator"
    "Output redirect"
    "Append redirect"
    "Input redirect"
    "JSON processor usage"
    "Grep with pipe"
    "curl with variable data"
    "Variable assignment"
    "Environment variable export"
    "Variable expansion in echo"
)

show_help() {
    cat << EOF
BULLETPROOF Bash Pattern Validator

USAGE:
    ./scripts/validate-bash-patterns.sh [options] [target]

OPTIONS:
    -h, --help          Show this help message
    -f, --file FILE     Validate a specific script file
    -c, --command CMD   Validate a single command string
    -d, --directory DIR Validate all .sh files in directory
    --all-scripts       Validate all scripts in ./scripts/ directory

EXAMPLES:
    # Validate a single script file
    ./scripts/validate-bash-patterns.sh --file scripts/api-test.sh
    
    # Validate a command string
    ./scripts/validate-bash-patterns.sh --command "curl -s http://localhost:3000 | jq '.gameId'"
    
    # Validate all scripts in ./scripts/ directory
    ./scripts/validate-bash-patterns.sh --all-scripts
    
    # Validate scripts in specific directory
    ./scripts/validate-bash-patterns.sh --directory ./my-scripts/

FORBIDDEN PATTERNS:
    The following patterns trigger permission prompts and are forbidden:
    - Command substitution: \$(...), backticks
    - Pipe operations: |, | command
    - Command chaining: &&, ||, ;
    - Redirects: >, >>, <
    - Complex operations: jq, variable assignments, exports

SAFE ALTERNATIVES:
    Instead of:  VAR=\$(curl ... | jq '.field')
    Use:         curl ... > temp.json; jq '.field' temp.json > result.txt; read VAR < result.txt
    
    Instead of:  curl ... | grep pattern
    Use:         curl ... > temp.txt; grep pattern temp.txt

EOF
}

validate_text() {
    local text="$1"
    local source_name="$2"
    local violations=0
    
    echo "$text" > "$TEMP_DIR/input.txt"
    validate_file_content "$TEMP_DIR/input.txt" "$source_name"
}

validate_text_from_file() {
    local file_path="$1"
    local source_name="$2"
    validate_file_content "$file_path" "$source_name"
}

validate_file_content() {
    local input_file="$1"
    local source_name="$2"
    local violations=0
    
    echo "🔍 Validating: $source_name"
    echo "----------------------------------------"
    
    # Check each forbidden pattern
    for i in "${!FORBIDDEN_PATTERNS[@]}"; do
        local pattern="${FORBIDDEN_PATTERNS[$i]}"
        local description="${PATTERN_DESCRIPTIONS[$i]}"
        
        # Check if pattern exists in input file
        if grep -q "$pattern" "$input_file"; then
            echo -e "${RED}❌ VIOLATION: $description${NC}"
            echo -e "${YELLOW}   Pattern: $pattern${NC}"
            
            # Show the offending lines
            grep -n "$pattern" "$input_file" > "$TEMP_DIR/matches.txt"
            while read -r line; do
                echo -e "${RED}   Line: $line${NC}"
            done < "$TEMP_DIR/matches.txt"
            echo ""
            
            violations=$((violations + 1))
        fi
    done
    
    if [ $violations -eq 0 ]; then
        echo -e "${GREEN}✅ CLEAN: No forbidden patterns found${NC}"
    else
        echo -e "${RED}❌ TOTAL VIOLATIONS: $violations${NC}"
    fi
    
    echo ""
    return $violations
}

validate_file() {
    local file_path="$1"
    
    if [ ! -f "$file_path" ]; then
        echo -e "${RED}❌ File not found: $file_path${NC}"
        return 1
    fi
    
    if [ ! -r "$file_path" ]; then
        echo -e "${RED}❌ File not readable: $file_path${NC}"
        return 1
    fi
    
    # Read file content safely using temp file without command substitution
    cat "$file_path" > "$TEMP_DIR/file_content.txt"
    # Pass file content via temp file to validation function
    validate_text_from_file "$TEMP_DIR/file_content.txt" "$file_path"
}

validate_directory() {
    local dir_path="$1"
    local total_violations=0
    local files_checked=0
    
    if [ ! -d "$dir_path" ]; then
        echo -e "${RED}❌ Directory not found: $dir_path${NC}"
        return 1
    fi
    
    echo "🔍 Scanning directory: $dir_path"
    echo "========================================"
    echo ""
    
    # Find all .sh files
    find "$dir_path" -name "*.sh" -type f > "$TEMP_DIR/script_files.txt"
    
    if [ ! -s "$TEMP_DIR/script_files.txt" ]; then
        echo -e "${YELLOW}⚠️  No .sh files found in $dir_path${NC}"
        return 0
    fi
    
    while read -r script_file; do
        if [ -f "$script_file" ]; then
            validate_file "$script_file"
            local file_violations=$?
            total_violations=$((total_violations + file_violations))
            files_checked=$((files_checked + 1))
        fi
    done < "$TEMP_DIR/script_files.txt"
    
    echo "========================================"
    echo "📊 SUMMARY:"
    echo "   Files checked: $files_checked"
    if [ $total_violations -eq 0 ]; then
        echo -e "   ${GREEN}✅ Total violations: $total_violations${NC}"
        echo -e "   ${GREEN}🎉 All scripts are BULLETPROOF!${NC}"
    else
        echo -e "   ${RED}❌ Total violations: $total_violations${NC}"
        echo -e "   ${RED}🚨 Fix violations before proceeding${NC}"
    fi
    
    return $total_violations
}

# Main execution
main() {
    local target=""
    local mode="help"
    
    case "$1" in
        -h|--help|"")
            show_help
            exit 0
            ;;
        -f|--file)
            mode="file"
            target="$2"
            ;;
        -c|--command)
            mode="command"
            target="$2"
            ;;
        -d|--directory)
            mode="directory"
            target="$2"
            ;;
        --all-scripts)
            mode="directory"
            target="./scripts"
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
    
    if [ -z "$target" ] && [ "$mode" != "help" ]; then
        echo -e "${RED}❌ Target required for mode: $mode${NC}"
        show_help
        exit 1
    fi
    
    case "$mode" in
        file)
            validate_file "$target"
            exit $?
            ;;
        command)
            validate_text "$target" "command line"
            exit $?
            ;;
        directory)
            validate_directory "$target"
            exit $?
            ;;
    esac
}

# Execute if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi