"""
Tests for employee endpoints
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee


class TestEmployeeEndpoints:
    
    @pytest.mark.asyncio
    async def test_create_employee(self, authenticated_client: AsyncClient):
        """Test creating a new employee"""
        employee_data = {
            "name": "New Employee",
            "email": "new@example.com",
            "is_active": True
        }
        
        response = await authenticated_client.post("/api/v1/employees/", json=employee_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["name"] == employee_data["name"]
        assert data["email"] == employee_data["email"]
        assert data["is_active"] == employee_data["is_active"]
        assert data["is_activated"] == False  # New employees start unactivated
        assert "id" in data
    
    @pytest.mark.asyncio
    async def test_list_employees(self, authenticated_client: AsyncClient, test_employee: Employee):
        """Test listing employees"""
        response = await authenticated_client.get("/api/v1/employees/")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # At least our test employee
    
    @pytest.mark.asyncio
    async def test_get_employee(self, authenticated_client: AsyncClient, test_employee: Employee):
        """Test getting employee by ID"""
        response = await authenticated_client.get(f"/api/v1/employees/{test_employee.id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == test_employee.id
        assert data["name"] == test_employee.name
        assert data["email"] == test_employee.email
    
    @pytest.mark.asyncio
    async def test_update_employee(self, authenticated_client: AsyncClient, test_employee: Employee):
        """Test updating employee"""
        update_data = {"name": "Updated Name"}
        
        response = await authenticated_client.patch(
            f"/api/v1/employees/{test_employee.id}", 
            json=update_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == update_data["name"]
    
    @pytest.mark.asyncio
    async def test_activate_employee(self, client: AsyncClient, db_session: AsyncSession):
        """Test employee activation"""
        # Create unactivated employee with token
        employee = Employee(
            name="Inactive Employee",
            email="inactive@example.com",
            activation_token="test-token-123",
            is_active=True,
            is_activated=False
        )
        db_session.add(employee)
        await db_session.commit()
        
        # Test activation
        response = await client.post(
            "/api/v1/employees/activate",
            json={"token": "test-token-123"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["is_activated"] == True
    
    @pytest.mark.asyncio
    async def test_employee_not_found(self, authenticated_client: AsyncClient):
        """Test getting non-existent employee"""
        response = await authenticated_client.get("/api/v1/employees/9999")
        assert response.status_code == 404
