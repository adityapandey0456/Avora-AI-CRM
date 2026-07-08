from sqlalchemy import create_engine, Column, Integer, String, Text, Date, Time
from sqlalchemy.orm import declarative_base, sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Engine connection for SQLite (check_same_thread=False is needed for SQLite in FastAPI)
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Table Model
class InteractionLog(Base):
    __tablename__ = "interaction_logs"

    id = Column(Integer, primary_key=True, index=True)
    hcp_name = Column(String, index=True)
    interaction_type = Column(String)
    date = Column(Date)
    time = Column(Time)
    attendees = Column(String)
    topics_discussed = Column(Text)
    sentiment = Column(String)
    follow_up_actions = Column(Text)

# Create tables in the database
Base.metadata.create_all(bind=engine)

# Dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()