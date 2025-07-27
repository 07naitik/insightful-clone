"""
Database configuration and connection management
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import MetaData
from loguru import logger
from typing import AsyncGenerator

from app.core.config import settings

# Create async engine with extreme prepared statement disabling for pgbouncer compatibility
engine = create_async_engine(
    settings.SUPABASE_DB_URL,
    echo=settings.DEBUG,
    pool_pre_ping=False,  # Disable pre-ping to avoid prepared statements
    pool_recycle=60,  # Shorter recycle time
    pool_reset_on_return="rollback",  # Force rollback on return
    pool_size=1,  # Single connection to avoid statement conflicts
    max_overflow=0,  # No overflow connections
    # Extreme asyncpg configuration to disable ALL prepared statements
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "prepared_statement_name_func": None,  # Disable named prepared statements
        "server_settings": {
            "jit": "off",
            "plan_cache_mode": "force_generic_plan",
            "default_transaction_isolation": "read_committed",
        },
        "command_timeout": 30,
    },
    # Extreme execution options to force text queries
    execution_options={
        "compiled_cache": {},
        "render_postcompile": True,  # Force all parameters to be rendered as literals
        "schema_translate_map": None,
    },
    # Additional SQLAlchemy engine options
    future=True,  # Use future-style engine
)

# Create async session factory with strict isolation
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,  # Disable autoflush to prevent unexpected queries
    autocommit=False,
)

# Create declarative base with custom metadata for consistent naming
metadata = MetaData(
    naming_convention={
        "ix": "ix_%(column_0_label)s",
        "uq": "uq_%(table_name)s_%(column_0_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s"
    }
)

Base = declarative_base(metadata=metadata)


class Database:
    """Database connection manager"""
    
    def __init__(self):
        self.engine = engine
        self.session_factory = AsyncSessionLocal
    
    async def connect(self):
        """Connect to database"""
        try:
            # Test connection
            async with self.engine.begin() as conn:
                await conn.run_sync(lambda _: None)
            logger.info("Database connected successfully")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    async def disconnect(self):
        """Disconnect from database"""
        await self.engine.dispose()
        logger.info("Database disconnected")
    
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get database session"""
        async with self.session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()


# Global database instance
database = Database()


# Dependency to get database session
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get database session for FastAPI"""
    async for session in database.get_session():
        yield session
