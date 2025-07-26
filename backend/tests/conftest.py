"""
Test configuration and fixtures for Insightful Clone API tests
"""

import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import get_db_session, Base
from app.core.auth import auth_manager
from app.models.employee import Employee
from app.models.project import Project
from app.models.task import Task

# Test database URL (in-memory SQLite)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def db_engine():
    """Create test database engine"""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest.fixture
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session"""
    async_session = async_sessionmaker(db_engine, expire_on_commit=False)
    
    async with async_session() as session:
        yield session


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create test HTTP client"""
    
    def get_test_db_session():
        return db_session
    
    app.dependency_overrides[get_db_session] = get_test_db_session
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
    
    app.dependency_overrides.clear()


@pytest.fixture
async def test_employee(db_session: AsyncSession) -> Employee:
    """Create test employee"""
    employee = Employee(
        name="Test Employee",
        email="test@example.com",
        is_active=True,
        is_activated=True
    )
    db_session.add(employee)
    await db_session.commit()
    await db_session.refresh(employee)
    return employee


@pytest.fixture
async def test_project(db_session: AsyncSession) -> Project:
    """Create test project"""
    project = Project(
        name="Test Project",
        description="A test project"
    )
    db_session.add(project)
    await db_session.commit()
    await db_session.refresh(project)
    return project


@pytest.fixture
async def test_task(db_session: AsyncSession, test_project: Project) -> Task:
    """Create test task"""
    task = Task(
        name="Test Task",
        project_id=test_project.id
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)
    return task


@pytest.fixture
def auth_headers(test_employee: Employee) -> dict:
    """Create authorization headers with JWT token"""
    access_token = auth_manager.create_access_token(
        data={"sub": test_employee.id, "email": test_employee.email}
    )
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
async def authenticated_client(client: AsyncClient, auth_headers: dict) -> AsyncClient:
    """Create authenticated HTTP client"""
    client.headers.update(auth_headers)
    return client
