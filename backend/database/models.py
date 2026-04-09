from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database.database import Base


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    raw_text = Column(Text, nullable=False)
    parsed_data = Column(JSON, nullable=True)  # name, email, skills, experience, education, etc.
    embedding_id = Column(String, nullable=True)  # ChromaDB document ID
    created_at = Column(DateTime, default=datetime.utcnow)

    matches = relationship("Match", back_populates="resume", cascade="all, delete-orphan")

    @property
    def candidate_name(self):
        if self.parsed_data:
            return self.parsed_data.get("name", self.filename)
        return self.filename


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    company = Column(String, nullable=True)
    description = Column(Text, nullable=False)
    parsed_requirements = Column(JSON, nullable=True)  # required_skills, etc.
    embedding_id = Column(String, nullable=True)
    status = Column(String, default="active")  # active, closed
    created_at = Column(DateTime, default=datetime.utcnow)

    matches = relationship("Match", back_populates="job", cascade="all, delete-orphan")


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)

    # Scores (0-100)
    skill_score = Column(Float, default=0.0)
    experience_score = Column(Float, default=0.0)
    education_score = Column(Float, default=0.0)
    keyword_score = Column(Float, default=0.0)
    overall_score = Column(Float, default=0.0)

    # AI-generated analysis
    explanation = Column(Text, nullable=True)
    strengths = Column(JSON, nullable=True)    # List[str]
    weaknesses = Column(JSON, nullable=True)   # List[str]
    skill_gaps = Column(JSON, nullable=True)   # List[str]
    matching_skills = Column(JSON, nullable=True)  # List[str]
    recommendation = Column(String, nullable=True)  # "Strong Match", "Good Match", etc.
    resume_feedback = Column(Text, nullable=True)   # Improvement suggestions

    rank = Column(Integer, nullable=True)  # Rank within job
    created_at = Column(DateTime, default=datetime.utcnow)

    resume = relationship("Resume", back_populates="matches")
    job = relationship("Job", back_populates="matches")
