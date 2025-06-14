#!/usr/bin/env python3
"""
Simple test script to verify the upload functionality
"""
import requests
import io
from PIL import Image
import sys

def create_test_image():
    """Create a simple test image in memory"""
    # Create a simple red square image
    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    return img_bytes

def test_upload():
    """Test the upload endpoint"""
    try:
        # Create test image
        test_image = create_test_image()
        
        # Prepare the file for upload
        files = {'file': ('test_image.png', test_image, 'image/png')}
        
        # Make upload request
        response = requests.post('http://localhost:5000/upload', files=files)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 201:
            print("✅ Upload successful!")
            
            # Test serving the uploaded file
            result = response.json()
            file_url = f"http://localhost:5000{result['url']}"
            
            serve_response = requests.get(file_url)
            print(f"File serve status: {serve_response.status_code}")
            
            if serve_response.status_code == 200:
                print("✅ File serving successful!")
            else:
                print("❌ File serving failed!")
                
        else:
            print("❌ Upload failed!")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure the server is running on http://localhost:5000")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    # Check if PIL is available
    try:
        from PIL import Image
    except ImportError:
        print("❌ PIL (Pillow) is required for this test. Install with: pip install Pillow")
        sys.exit(1)
    
    print("Testing upload functionality...")
    test_upload() 