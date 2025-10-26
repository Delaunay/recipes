from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Table, Text, UniqueConstraint, JSON, create_engine, select, Boolean, Index
from sqlalchemy.orm import relationship, sessionmaker, declarative_base

from .common import Base


class Article(Base):
    """Full blog post to display"""
    __tablename__ = 'article'

    _id = Column(Integer, primary_key=True)
    title = Column(String, 50)
    namespace = Column(String, 255)
    tags = Column(JSON)
    extension = Column(JSON)


class ArticleBlock(Base):
    """Renderable block of a blog post"""
    __tablename__ = 'article_block'

    _id = Column(Integer, primary_key=True)
    title = Column(String, 50)

    page_id = Column(Integer, ForeignKey('recipes._id'), nullable=True)
    kind = Column(String, 25)
    extension = Column(JSON)
    # SpreadSheet like info
    # Plots + Spreadsheet
    # Text | Article
    # Images
    # Layout that hold more blocks
    # list ? or this is part of a markdown display
    # code block
    # video
    # audio
    # file attachment
    # Latex
    # timeline
    # mermaid plot
    # widget
    # references
    # footnote
    # heading + paragraph
