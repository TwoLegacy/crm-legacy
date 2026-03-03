import sys

try:
    with open('build_output.log', 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
        
    print("----- BUILD LOG OUTPUT -----")
    # Only print lines that seem to contain errors or warnings to keep output small
    for line in content.split('\n'):
        if 'error' in line.lower() or 'Failed' in line or '.ts' in line or '.tsx' in line:
            print(line[:200]) # Trucate extremely long lines
            
except Exception as e:
    print(f"Failed to read log: {e}")
