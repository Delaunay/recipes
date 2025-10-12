#!/usr/bin/env python3
"""
Test script for USDA API endpoints

This script demonstrates the complete workflow:
1. Search for USDA foods
2. Get details for a specific food
3. Apply nutrition data to an ingredient

Before running, make sure the Flask server is running:
    cd /home/setepenre/work/website/recipes
    python -m recipes.server.server
"""

import requests
import json
from typing import Optional

# Configuration
BASE_URL = "http://localhost:5000"
API_BASE = f"{BASE_URL}/api/usda"


def search_foods(query: str, limit: int = 10) -> Optional[dict]:
    """Search for USDA foods"""
    print(f"\n{'='*60}")
    print(f"🔍 Searching for: {query}")
    print(f"{'='*60}")

    response = requests.get(f"{API_BASE}/search", params={
        "q": query,
        "limit": limit
    })

    if response.status_code != 200:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
        return None

    data = response.json()
    print(f"✅ Found {data['count']} results\n")

    for i, food in enumerate(data['results'], 1):
        print(f"{i}. {food['description']}")
        print(f"   FDC ID: {food['fdc_id']}")
        print(f"   Type: {food['data_type']}")
        print()

    return data


def get_food_details(fdc_id: str) -> Optional[dict]:
    """Get detailed nutrition information for a food"""
    print(f"\n{'='*60}")
    print(f"📊 Getting details for FDC ID: {fdc_id}")
    print(f"{'='*60}")

    response = requests.get(f"{API_BASE}/food/{fdc_id}")

    if response.status_code != 200:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
        return None

    data = response.json()
    print(f"✅ Food: {data['description']}\n")

    nutrients = data.get('nutrients', [])
    print(f"Found {len(nutrients)} nutrients:")

    # Show top 10 nutrients
    for i, nutrient in enumerate(nutrients[:10], 1):
        amount = nutrient['amount']
        unit = nutrient['unit']
        name = nutrient['name']
        print(f"  {i}. {name}: {amount} {unit}")

    if len(nutrients) > 10:
        print(f"  ... and {len(nutrients) - 10} more nutrients")

    return data


def apply_to_ingredient(ingredient_id: int, fdc_id: str, overwrite: bool = False) -> Optional[dict]:
    """Apply USDA data to an ingredient"""
    print(f"\n{'='*60}")
    print(f"💾 Applying FDC ID {fdc_id} to ingredient {ingredient_id}")
    print(f"{'='*60}")

    response = requests.post(f"{API_BASE}/apply", json={
        "ingredient_id": ingredient_id,
        "fdc_id": fdc_id,
        "overwrite": overwrite
    })

    if response.status_code != 200:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
        return None

    data = response.json()
    print(f"✅ Success!")
    print(f"   Applied: {data['usda_food']}")
    print(f"   Added: {data['added_compositions']} nutrient compositions")
    print(f"   Source: USDA (FDC ID: {data['fdc_id']})")

    return data


def get_ingredients() -> Optional[list]:
    """Get list of ingredients from the database"""
    response = requests.get(f"{BASE_URL}/ingredients")

    if response.status_code != 200:
        print(f"❌ Error getting ingredients: {response.status_code}")
        return None

    return response.json()


def demo_workflow():
    """Demonstrate the complete USDA workflow"""
    print("\n" + "="*60)
    print("🎯 USDA API Demo - Complete Workflow")
    print("="*60)

    # Step 1: Search for chicken breast
    search_query = "chicken breast"
    search_results = search_foods(search_query, limit=5)

    if not search_results or not search_results['results']:
        print("❌ No results found")
        return

    # Get the first result
    first_food = search_results['results'][0]
    fdc_id = first_food['fdc_id']

    # Step 2: Get details
    food_details = get_food_details(fdc_id)

    if not food_details:
        print("❌ Could not get food details")
        return

    # Step 3: Try to apply to an ingredient (if any exist)
    print(f"\n{'='*60}")
    print("🔍 Checking for existing ingredients...")
    print(f"{'='*60}")

    ingredients = get_ingredients()

    if not ingredients:
        print("❌ No ingredients found in database")
        print("\n💡 To test the apply functionality:")
        print("   1. Create an ingredient first using the web interface")
        print("   2. Note its ID")
        print("   3. Run this script again or use the apply_to_ingredient() function")
        return

    print(f"✅ Found {len(ingredients)} ingredients\n")

    # Show first few ingredients
    for i, ing in enumerate(ingredients[:5], 1):
        print(f"{i}. {ing['name']} (ID: {ing['id']})")

    # Ask user if they want to apply
    print(f"\n{'='*60}")
    print("⚠️  To apply USDA data to an ingredient, use:")
    print(f"   apply_to_ingredient(ingredient_id={ingredients[0]['id']}, fdc_id='{fdc_id}')")
    print("="*60)


def test_search_variations():
    """Test different search queries"""
    queries = [
        "chicken",
        "rice",
        "tomato",
        "milk",
        "apple"
    ]

    print("\n" + "="*60)
    print("🧪 Testing various search queries")
    print("="*60)

    for query in queries:
        results = search_foods(query, limit=3)
        if results:
            print(f"✅ {query}: {results['count']} results")
        else:
            print(f"❌ {query}: Failed")


if __name__ == "__main__":
    import sys

    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code != 200:
            print("❌ Server is not responding correctly")
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Is it running?")
        print("\nStart the server with:")
        print("  cd /home/setepenre/work/website/recipes")
        print("  python -m recipes.server.server")
        sys.exit(1)

    print("✅ Server is running")

    # Run demo
    demo_workflow()

    # Optionally run search variations
    # test_search_variations()

    print("\n" + "="*60)
    print("✅ Demo complete!")
    print("="*60)
    print("\nYou can also use the functions directly:")
    print("  search_foods('chicken breast')")
    print("  get_food_details('1105904')")
    print("  apply_to_ingredient(ingredient_id=1, fdc_id='1105904')")
    print()

