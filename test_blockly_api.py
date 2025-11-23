#!/usr/bin/env python3
"""
Test script for the Blockly conversion API
"""

import sys
import json
sys.path.insert(0, 'recipes/server/projects')

from blockly.text_to_block import text_to_block

# Test code
test_code = """
def hello_world():
    print("Hello, World!")
    return 42

result = hello_world()
print(f"Result: {result}")
"""

print("Testing text_to_block conversion...")
print("=" * 60)
print("Input code:")
print(test_code)
print("=" * 60)

# Call the conversion function
result = text_to_block({'code': test_code})

print("\nConversion result:")
print(json.dumps(result, indent=2))

print("\n" + "=" * 60)
print(f"Number of blocks generated: {len(result.get('blocks', {}).get('blocks', []))}")
if 'error' in result:
    print(f"ERROR: {result['error']}")
else:
    print("SUCCESS: Conversion completed without errors")

