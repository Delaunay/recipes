#!/usr/bin/env python3
"""
Verify Static Build Script
Checks that all expected JSON files are created correctly
"""

import os
import json
from pathlib import Path
import sys

def verify_static_build():
    """Verify that the static build contains all expected files"""
    base_dir = Path(__file__).parent.parent
    static_dir = base_dir / "static_build"
    
    if not static_dir.exists():
        print("❌ static_build directory not found!")
        return False
    
    print(f"🔍 Verifying static build in: {static_dir}")
    
    # Check main files
    main_files = [
        "index.html",
        "404.html",
        ".nojekyll"
    ]
    
    print("\n📄 Checking main files:")
    for file in main_files:
        file_path = static_dir / file
        if file_path.exists():
            print(f"  ✅ {file}")
        else:
            print(f"  ❌ {file} - MISSING")
    
    # Check API directory
    api_dir = static_dir / "api"
    if not api_dir.exists():
        print("\n❌ API directory not found!")
        return False
    
    print(f"\n🔗 API directory found: {api_dir}")
    
    # Expected API files
    expected_api_files = [
        "index.json",
        "health.json", 
        "recipes.json",
        "ingredients.json",
        "categories.json",
        "unit/conversions.json"
    ]
    
    print("\n📋 Checking API files:")
    for api_file in expected_api_files:
        file_path = api_dir / api_file
        if file_path.exists():
            try:
                with open(file_path, 'r') as f:
                    data = json.load(f)
                
                size = file_path.stat().st_size
                if isinstance(data, list):
                    print(f"  ✅ {api_file} - {len(data)} items ({size} bytes)")
                elif isinstance(data, dict):
                    keys = list(data.keys())
                    print(f"  ✅ {api_file} - dict with keys: {keys[:3]}{'...' if len(keys) > 3 else ''} ({size} bytes)")
                else:
                    print(f"  ✅ {api_file} - {type(data).__name__} ({size} bytes)")
                    
            except json.JSONDecodeError as e:
                print(f"  ⚠️  {api_file} - INVALID JSON: {e}")
            except Exception as e:
                print(f"  ⚠️  {api_file} - ERROR: {e}")
        else:
            print(f"  ❌ {api_file} - MISSING")
            # Check if parent directory exists
            parent = file_path.parent
            if not parent.exists():
                print(f"      (parent directory {parent} doesn't exist)")
    
    # List all files in API directory
    print(f"\n📁 All files in API directory:")
    try:
        for item in api_dir.rglob("*"):
            if item.is_file():
                rel_path = item.relative_to(api_dir)
                size = item.stat().st_size
                print(f"  📄 {rel_path} ({size} bytes)")
    except Exception as e:
        print(f"  ❌ Error listing API files: {e}")
    
    # Check assets directory
    assets_dir = static_dir / "assets"
    if assets_dir.exists():
        asset_files = list(assets_dir.glob("*"))
        print(f"\n🎨 Assets directory: {len(asset_files)} files")
        for asset in asset_files[:5]:  # Show first 5
            size = asset.stat().st_size
            print(f"  📄 {asset.name} ({size} bytes)")
        if len(asset_files) > 5:
            print(f"  ... and {len(asset_files) - 5} more files")
    else:
        print("\n⚠️  Assets directory not found")
    
    # Check uploads directory
    uploads_dir = static_dir / "uploads"
    if uploads_dir.exists():
        upload_files = list(uploads_dir.rglob("*"))
        upload_files = [f for f in upload_files if f.is_file()]
        print(f"\n📷 Uploads directory: {len(upload_files)} files")
    else:
        print("\n📷 Uploads directory not found (this is OK if no uploads exist)")
    
    print(f"\n📊 Build verification complete!")
    
    # Summary
    total_files = len(list(static_dir.rglob("*")))
    total_size = sum(f.stat().st_size for f in static_dir.rglob("*") if f.is_file())
    print(f"📈 Total files: {total_files}")
    print(f"📈 Total size: {total_size / 1024 / 1024:.2f} MB")
    
    return True

if __name__ == "__main__":
    try:
        success = verify_static_build()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        sys.exit(1) 