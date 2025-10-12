#!/usr/bin/env python3
"""
Unit tests for USDA CSV reader

Tests the core USDA reader functionality without requiring the Flask server.
"""

import sys
import os

# Add the recipes package to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from recipes.server.usda_reader import USDAReader


def test_usda_reader():
    """Test basic USDA reader functionality"""

    print("="*60)
    print("🧪 Testing USDA Reader")
    print("="*60)

    # Initialize reader
    print("\n1. Initializing USDA Reader...")
    try:
        reader = USDAReader()
        print("   ✅ Reader initialized")
    except Exception as e:
        print(f"   ❌ Failed to initialize: {e}")
        return False

    # Test search
    print("\n2. Testing search functionality...")
    try:
        results = reader.search_foods("chicken", limit=5)
        print(f"   ✅ Search returned {len(results)} results")

        if results:
            print("\n   Sample results:")
            for i, food in enumerate(results[:3], 1):
                print(f"   {i}. {food['description'][:60]}...")
                print(f"      FDC ID: {food['fdc_id']}, Type: {food['data_type']}")
        else:
            print("   ⚠️  No results found")
    except Exception as e:
        print(f"   ❌ Search failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    # Test get_food_details
    if results:
        print("\n3. Testing get_food_details...")
        try:
            fdc_id = results[0]['fdc_id']
            details = reader.get_food_details(fdc_id)

            if details:
                print(f"   ✅ Got details for: {details['description'][:60]}")
                nutrients = details.get('nutrients', [])
                print(f"   ✅ Found {len(nutrients)} nutrients")

                if nutrients:
                    print("\n   Sample nutrients:")
                    for i, nutrient in enumerate(nutrients[:5], 1):
                        print(f"   {i}. {nutrient['name']}: {nutrient['amount']} {nutrient['unit']}")
            else:
                print(f"   ❌ No details found for FDC ID: {fdc_id}")
                return False
        except Exception as e:
            print(f"   ❌ get_food_details failed: {e}")
            import traceback
            traceback.print_exc()
            return False

    # Test get_nutrient_info
    print("\n4. Testing get_nutrient_info...")
    try:
        # Common nutrient IDs
        nutrient_id = "1008"  # Energy
        nutrient = reader.get_nutrient_info(nutrient_id)

        if nutrient:
            print(f"   ✅ Got nutrient: {nutrient['name']} ({nutrient['unit_name']})")
        else:
            print(f"   ❌ No nutrient found for ID: {nutrient_id}")
            return False
    except Exception as e:
        print(f"   ❌ get_nutrient_info failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    print("\n" + "="*60)
    print("✅ All tests passed!")
    print("="*60)
    return True


def test_search_variations():
    """Test different search queries"""
    print("\n" + "="*60)
    print("🧪 Testing Search Variations")
    print("="*60)

    reader = USDAReader()

    test_queries = [
        ("chicken breast", 5),
        ("apple", 3),
        ("milk", 3),
        ("cheese", 3),
        ("nonexistentfood12345", 1)
    ]

    for query, limit in test_queries:
        print(f"\nSearching for: '{query}' (limit={limit})")
        try:
            results = reader.search_foods(query, limit=limit)
            print(f"  ✅ Found {len(results)} results")
        except Exception as e:
            print(f"  ❌ Error: {e}")


def verify_csv_files():
    """Verify that USDA CSV files exist and are readable"""
    print("\n" + "="*60)
    print("🔍 Verifying USDA CSV Files")
    print("="*60)

    reader = USDAReader()

    files = {
        "food.csv": reader.food_csv,
        "food_nutrient.csv": reader.food_nutrient_csv,
        "nutrient.csv": reader.nutrient_csv,
        "food_category.csv": reader.food_category_csv
    }

    all_exist = True

    for name, path in files.items():
        if os.path.exists(path):
            size_mb = os.path.getsize(path) / (1024 * 1024)
            print(f"  ✅ {name}: {size_mb:.1f} MB")
        else:
            print(f"  ❌ {name}: NOT FOUND at {path}")
            all_exist = False

    return all_exist


if __name__ == "__main__":
    print("\n" + "🚀 USDA Reader Test Suite\n")

    # First verify files exist
    if not verify_csv_files():
        print("\n❌ CSV files missing! Please download USDA data first.")
        print("   Download from: https://fdc.nal.usda.gov/download-datasets")
        sys.exit(1)

    # Run main tests
    if test_usda_reader():
        # Run additional tests
        test_search_variations()

        print("\n" + "="*60)
        print("✅ All tests completed successfully!")
        print("="*60)
    else:
        print("\n" + "="*60)
        print("❌ Tests failed!")
        print("="*60)
        sys.exit(1)

