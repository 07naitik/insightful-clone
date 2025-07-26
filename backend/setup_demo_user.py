#!/usr/bin/env python3
"""
Setup script to create a demo employee for API testing
Run this to create the initial employee account needed for authentication testing
"""

import asyncio
import sys
from sqlalchemy import text
from app.core.database import get_db_session


async def create_demo_employee():
    """Create a demo employee for API testing"""
    async for db in get_db_session():
        try:
            print("🔄 Creating demo employee...")
            
            # Insert demo employee
            query = text("""
                INSERT INTO employees (name, email, is_active, is_activated, activation_token, created_at, updated_at) 
                VALUES (:name, :email, :is_active, :is_activated, :activation_token, NOW(), NOW())
                ON CONFLICT (email) DO NOTHING
                RETURNING id, activation_token;
            """)
            
            result = await db.execute(query, {
                "name": "Demo Admin",
                "email": "admin@demo.com",
                "is_active": True,
                "is_activated": False,
                "activation_token": "demo-activation-token-123"
            })
            
            await db.commit()
            row = result.fetchone()
            
            if row:
                print(f"✅ Created demo employee successfully!")
                print(f"   ID: {row[0]}")
                print(f"   Email: admin@demo.com")
                print(f"   Activation Token: {row[1]}")
                print()
                print("🔧 Next steps:")
                print("1. Activate the employee:")
                print('   curl -X POST "http://localhost:8000/api/v1/employees/activate" \\')
                print('     -H "Content-Type: application/json" \\')
                print('     -d \'{"token": "demo-activation-token-123"}\'')
                print()
                print("2. Get authentication token:")
                print('   curl -X POST "http://localhost:8000/api/v1/auth/token" \\')
                print('     -H "Content-Type: application/x-www-form-urlencoded" \\')
                print('     -d "email=admin@demo.com&password=any-password"')
                print()
                print("3. Use the returned access_token for authenticated requests!")
                print("   See API_TESTING_GUIDE.md for complete examples.")
            else:
                print("ℹ️  Demo employee already exists with email: admin@demo.com")
                print("   You can proceed with activation using token: demo-activation-token-123")
                
        except Exception as e:
            print(f"❌ Error creating demo employee: {e}")
            await db.rollback()
            return False
        finally:
            await db.close()
    
    return True


if __name__ == "__main__":
    print("🚀 Setting up demo employee for API testing...")
    print()
    
    try:
        success = asyncio.run(create_demo_employee())
        if success:
            print()
            print("🎉 Setup complete! You can now test the API endpoints.")
        else:
            print("❌ Setup failed. Check the error messages above.")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Failed to run setup: {e}")
        print("Make sure the backend server is running and database is connected.")
        sys.exit(1)
