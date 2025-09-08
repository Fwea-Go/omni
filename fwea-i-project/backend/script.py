# Create complete FWEA-I launch package with all assets
import os
import json

print("🚀 Creating complete FWEA-I launch package...")

# Create directory structure
directories = [
    "frontend",
    "backend", 
    "backend/services",
    "backend/models",
    "backend/scripts",
    "backend/uploads",
    "backend/uploads/previews",
    "config",
    "docs"
]

for dir_name in directories:
    os.makedirs(dir_name, exist_ok=True)
    print(f"✅ Created directory: {dir_name}")

print(f"\n📁 Created {len(directories)} directories")
print("📦 Ready to create all project files...")