from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# If using SQLite, check_same_thread=False is needed for multi-threaded FastAPI requests
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def run_auto_migrations():
    """
    Safely adds any missing columns to existing SQLite / PostgreSQL tables
    to prevent breaking existing databases when schemas are updated.
    """
    column_definitions = {
        "medicines": [
            ("code", "VARCHAR(50)"),
            ("company_name", "VARCHAR(200)"),
            ("product_type", "VARCHAR(50) DEFAULT 'TABLETS'"),
            ("packing", "VARCHAR(50) DEFAULT '10\" S'"),
            ("conversion", "INTEGER DEFAULT 10"),
            ("rack_no", "VARCHAR(50)"),
            ("purchase_tax_rate", "FLOAT DEFAULT 12.0"),
            ("show_gst_in_purchase", "BOOLEAN DEFAULT 1"),
            ("schedule_code", "VARCHAR(10) DEFAULT 'H'"),
            ("max_discount_limit", "FLOAT DEFAULT 0.0"),
            ("sales_discount", "FLOAT DEFAULT 0.0"),
            ("add_points_percent", "FLOAT DEFAULT 0.0"),
            ("allow_negative_stock", "BOOLEAN DEFAULT 0"),
            ("is_narcotic", "BOOLEAN DEFAULT 0"),
            ("reorder_qty", "INTEGER DEFAULT 50"),
            ("launched_on", "VARCHAR(50)"),
            ("comments", "TEXT"),
        ],
        "customers": [
            ("code", "VARCHAR(50)"),
            ("locality", "VARCHAR(150)"),
            ("city", "VARCHAR(100) DEFAULT 'PARVATHIPURAM'"),
            ("pincode", "VARCHAR(20) DEFAULT '535501'"),
            ("mobile_2", "VARCHAR(50)"),
            ("email", "VARCHAR(100)"),
            ("doctor_id", "VARCHAR(36)"),
            ("doctor_name", "VARCHAR(150)"),
            ("category", "VARCHAR(50) DEFAULT 'PATIENT'"),
            ("gstin", "VARCHAR(50)"),
            ("discount_percent", "FLOAT DEFAULT 0.0"),
            ("discount_ceiling", "FLOAT DEFAULT 0.0"),
            ("billing_on", "VARCHAR(50) DEFAULT 'CREDIT'"),
        ],
        "manufacturers": [
            ("code", "VARCHAR(50)"),
        ]
    }

    with engine.connect() as conn:
        for table_name, cols in column_definitions.items():
            try:
                # Check if table exists
                if settings.DATABASE_URL.startswith("sqlite"):
                    existing_cols_res = conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
                    existing_cols = {row[1] for row in existing_cols_res}
                    for col_name, col_type in cols:
                        if col_name not in existing_cols:
                            conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                else:
                    # Postgres support
                    for col_name, col_type in cols:
                        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
                    conn.commit()
            except Exception as e:
                # Table might not exist yet, create_all will create it with all columns
                pass

def get_db():
    """
    Dependency that creates an independent database session per request,
    and automatically closes it when finished.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
