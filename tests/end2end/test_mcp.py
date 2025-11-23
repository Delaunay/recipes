#!/usr/bin/env python3
"""
Test script for MCP Server

This script tests the MCP server endpoints to ensure everything is working correctly.
"""

import requests
import json
from typing import Dict, Any


class MCPTester:
    """Test client for MCP server"""
    
    def __init__(self, base_url: str = "http://localhost:5001"):
        self.base_url = base_url
        self.mcp_url = f"{base_url}/mcp"
    
    def test_server_info(self):
        """Test server info endpoint"""
        print("\n=== Testing Server Info ===")
        response = requests.get(f"{self.mcp_url}/info")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    
    def test_list_tools(self):
        """Test listing all tools"""
        print("\n=== Testing List Tools ===")
        response = requests.get(f"{self.mcp_url}/tools")
        data = response.json()
        print(f"Status: {response.status_code}")
        print(f"Number of tools: {len(data.get('tools', []))}")
        print("\nAvailable tools:")
        for tool in data.get('tools', [])[:5]:  # Show first 5
            print(f"  - {tool['name']}: {tool['description']}")
        print(f"  ... and {len(data.get('tools', [])) - 5} more")
        return response.status_code == 200
    
    def test_list_prompts(self):
        """Test listing all prompts"""
        print("\n=== Testing List Prompts ===")
        response = requests.get(f"{self.mcp_url}/prompts")
        data = response.json()
        print(f"Status: {response.status_code}")
        print(f"Number of prompts: {len(data.get('prompts', []))}")
        print("\nAvailable prompts:")
        for prompt in data.get('prompts', []):
            print(f"  - {prompt['name']}: {prompt['description']}")
        return response.status_code == 200
    
    def test_search_recipes(self):
        """Test recipe search tool"""
        print("\n=== Testing Recipe Search ===")
        response = requests.post(
            f"{self.mcp_url}/tools/search_recipes",
            json={"query": "chicken"}
        )
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)[:500]}...")
        return response.status_code == 200
    
    def test_list_recipes(self):
        """Test listing recipes"""
        print("\n=== Testing List Recipes ===")
        response = requests.post(
            f"{self.mcp_url}/tools/list_recipes",
            json={"limit": 5}
        )
        print(f"Status: {response.status_code}")
        data = response.json()
        if isinstance(data, list):
            print(f"Number of recipes returned: {len(data)}")
            if data:
                print(f"First recipe: {data[0].get('title', 'N/A')}")
        else:
            print(f"Response: {json.dumps(data, indent=2)[:500]}...")
        return response.status_code == 200
    
    def test_list_tasks(self):
        """Test listing tasks"""
        print("\n=== Testing List Tasks ===")
        response = requests.post(
            f"{self.mcp_url}/tools/list_tasks",
            json={}
        )
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)[:500]}...")
        return response.status_code == 200
    
    def test_list_articles(self):
        """Test listing articles"""
        print("\n=== Testing List Articles ===")
        response = requests.post(
            f"{self.mcp_url}/tools/list_articles",
            json={}
        )
        print(f"Status: {response.status_code}")
        data = response.json()
        if isinstance(data, list):
            print(f"Number of articles: {len(data)}")
        else:
            print(f"Response: {json.dumps(data, indent=2)[:500]}...")
        return response.status_code == 200
    
    def test_list_events(self):
        """Test listing calendar events"""
        print("\n=== Testing List Events ===")
        response = requests.post(
            f"{self.mcp_url}/tools/list_events",
            json={}
        )
        print(f"Status: {response.status_code}")
        data = response.json()
        if isinstance(data, list):
            print(f"Number of events: {len(data)}")
        else:
            print(f"Response: {json.dumps(data, indent=2)[:500]}...")
        return response.status_code == 200
    
    def test_kv_store(self):
        """Test key-value store"""
        print("\n=== Testing Key-Value Store ===")
        
        # List topics
        response = requests.post(
            f"{self.mcp_url}/tools/list_kv_topics",
            json={}
        )
        print(f"List topics status: {response.status_code}")
        data = response.json()
        if isinstance(data, list):
            print(f"Number of topics: {len(data)}")
        
        return response.status_code == 200
    
    def test_list_units(self):
        """Test unit conversion tools"""
        print("\n=== Testing Unit Conversion ===")
        response = requests.post(
            f"{self.mcp_url}/tools/list_available_units",
            json={"unit_type": "all"}
        )
        print(f"Status: {response.status_code}")
        data = response.json()
        if isinstance(data, list):
            print(f"Number of units: {len(data)}")
            print(f"Sample units: {data[:10]}")
        else:
            print(f"Response: {json.dumps(data, indent=2)[:500]}...")
        return response.status_code == 200
    
    def test_meal_planning_prompt(self):
        """Test meal planning prompt"""
        print("\n=== Testing Meal Planning Prompt ===")
        response = requests.post(
            f"{self.mcp_url}/prompts/meal_planning",
            json={
                "days": 7,
                "people_count": 4,
                "dietary_preferences": "vegetarian"
            }
        )
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Prompt content preview: {data.get('content', '')[:300]}...")
        return response.status_code == 200
    
    def test_invalid_tool(self):
        """Test calling a non-existent tool"""
        print("\n=== Testing Invalid Tool (Expected to Fail) ===")
        response = requests.post(
            f"{self.mcp_url}/tools/nonexistent_tool",
            json={}
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 404
    
    def run_all_tests(self):
        """Run all tests"""
        print("\n" + "="*60)
        print("MCP Server Test Suite")
        print("="*60)
        
        tests = [
            ("Server Info", self.test_server_info),
            ("List Tools", self.test_list_tools),
            ("List Prompts", self.test_list_prompts),
            ("Search Recipes", self.test_search_recipes),
            ("List Recipes", self.test_list_recipes),
            ("List Tasks", self.test_list_tasks),
            ("List Articles", self.test_list_articles),
            ("List Events", self.test_list_events),
            ("Key-Value Store", self.test_kv_store),
            ("List Units", self.test_list_units),
            ("Meal Planning Prompt", self.test_meal_planning_prompt),
            ("Invalid Tool", self.test_invalid_tool),
        ]
        
        results = []
        for name, test_func in tests:
            try:
                passed = test_func()
                results.append((name, passed))
            except Exception as e:
                print(f"\nError in {name}: {str(e)}")
                results.append((name, False))
        
        # Summary
        print("\n" + "="*60)
        print("Test Results Summary")
        print("="*60)
        
        passed = sum(1 for _, result in results if result)
        total = len(results)
        
        for name, result in results:
            status = "✓ PASS" if result else "✗ FAIL"
            print(f"{status} - {name}")
        
        print(f"\nTotal: {passed}/{total} tests passed")
        print("="*60)
        
        return passed == total


def main():
    """Main entry point"""
    import sys
    
    # Check if server URL is provided
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5001"
    
    print(f"Testing MCP server at: {base_url}")
    
    tester = MCPTester(base_url)
    
    try:
        success = tester.run_all_tests()
        sys.exit(0 if success else 1)
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Could not connect to server!")
        print(f"   Make sure the Flask server is running at {base_url}")
        print("   Run: make back-dev")
        sys.exit(1)


if __name__ == "__main__":
    main()

