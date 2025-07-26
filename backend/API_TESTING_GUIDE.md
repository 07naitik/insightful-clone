# Complete API Testing Guide

## Problem
The API requires authentication for all employee operations, but you need an employee account to authenticate. This creates a chicken-and-egg problem.

## Solution
We need to create and activate an employee first, then use that for authentication.

## Prerequisites
1. Backend server running on `http://localhost:8000`
2. Database connected and tables created
3. Tool like curl, Postman, or similar for API testing

## Step-by-Step Testing Guide

### Step 1: Create Initial Employee Directly in Database

Since all employee endpoints require authentication, we need to create the first employee directly in the database. You can do this in several ways:

#### Option A: Using database tools (Recommended)
Connect to your Supabase database and insert an employee:

```sql
INSERT INTO employees (name, email, is_active, is_activated, activation_token, created_at, updated_at) 
VALUES (
    'Admin User', 
    'admin@test.com', 
    true, 
    false, 
    'demo-token-123', 
    NOW(), 
    NOW()
);
```

#### Option B: Create a temporary setup script
Create a file `setup_demo_user.py` in the backend directory:

```python
import asyncio
import secrets
from sqlalchemy import text
from app.core.database import get_db_session

async def create_demo_employee():
    async for db in get_db_session():
        try:
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
                print(f"Created employee with ID: {row[0]}")
                print(f"Activation token: {row[1]}")
            else:
                print("Employee already exists")
                
        except Exception as e:
            print(f"Error: {e}")
            await db.rollback()
        finally:
            await db.close()

if __name__ == "__main__":
    asyncio.run(create_demo_employee())
```

### Step 2: Activate the Employee

**Endpoint:** `POST /api/v1/employees/activate`
**Authentication:** None required ✅

```bash
curl -X POST "http://localhost:8000/api/v1/employees/activate" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "demo-activation-token-123"
  }'
```

**Expected Response:**
```json
{
  "id": 1,
  "name": "Demo Admin",
  "email": "admin@demo.com",
  "is_active": true,
  "is_activated": true,
  "created_at": "2025-01-26T16:15:00Z",
  "updated_at": "2025-01-26T16:15:00Z"
}
```

### Step 3: Authenticate to Get Access Token

**Endpoint:** `POST /api/v1/auth/token`
**Authentication:** None required ✅

```bash
curl -X POST "http://localhost:8000/api/v1/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=admin@demo.com&password=any-password-for-demo"
```

**Expected Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Save the access_token for next steps!**

### Step 4: Test Authenticated Endpoints

Now you can use the access token for all employee operations.

#### A. List Employees

```bash
curl -X GET "http://localhost:8000/api/v1/employees/" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

#### B. Create New Employee

```bash
curl -X POST "http://localhost:8000/api/v1/employees/" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "is_active": true
  }'
```

#### C. Get Specific Employee

```bash
curl -X GET "http://localhost:8000/api/v1/employees/1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

#### D. Update Employee

```bash
curl -X PATCH "http://localhost:8000/api/v1/employees/1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "is_active": false
  }'
```

#### E. Delete Employee

```bash
curl -X DELETE "http://localhost:8000/api/v1/employees/2" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## Common Issues & Solutions

### 1. "Not authenticated" Error
- Make sure you include the `Authorization: Bearer <token>` header
- Verify the token is not expired (24-hour expiry)
- Check that the employee account is both `is_active=true` AND `is_activated=true`

### 2. "Invalid credentials or account not activated" Error
- The employee doesn't exist in the database
- The employee exists but `is_activated=false`
- The employee exists but `is_active=false`

### 3. Schema Validation Errors
- Employee creation only accepts: `name`, `email`, `is_active`
- Don't send fields like `password`, `role`, `hourly_rate`, etc.

## Correct Employee Schema

### For Creating Employees:
```json
{
  "name": "string",
  "email": "user@example.com",
  "is_active": true
}
```

### For Updating Employees:
```json
{
  "name": "string (optional)",
  "email": "user@example.com (optional)",
  "is_active": true (optional)
}
```

### For Activation:
```json
{
  "token": "activation-token-here"
}
```

## Notes

1. **Demo Authentication**: The auth system is simplified for demo purposes - it only checks email existence and activation status, not actual password validation.

2. **Token Expiry**: Access tokens expire after 24 hours. You'll need to re-authenticate.

3. **CORS**: The API allows all origins (`*`) for development.

4. **Database**: Make sure your Supabase database is connected and the `employees` table exists.

## Testing with Postman

1. Import the endpoints into Postman
2. Set up environment variables for `base_url` and `access_token`
3. Use the authorization tab to set Bearer token automatically
4. Follow the steps above in order

## Swagger UI

You can also test interactively at: `http://localhost:8000/docs`

Remember to:
1. First activate an employee using the `/activate` endpoint
2. Get a token using `/auth/token`
3. Click "Authorize" in Swagger and enter `Bearer YOUR_TOKEN`
4. Then test other endpoints
