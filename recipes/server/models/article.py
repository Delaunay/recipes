from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Table, Text, UniqueConstraint, JSON, create_engine, select, Boolean, Index
from sqlalchemy.orm import relationship, sessionmaker, declarative_base

from .common import Base


class Article(Base):
    """Full blog post to display"""
    __tablename__ = 'articles'

    _id = Column(Integer, primary_key=True)
    title = Column(String, 50)
    namespace = Column(String, 255)
    tags = Column(JSON)
    extension = Column(JSON)


#
# Data block could be reused on multuple articles ?
#
# class DataBlock(Base):
#     pass


class ArticleBlock(Base):
    """Renderable block of a blog post"""
    __tablename__ = 'article_blocks'

    _id = Column(Integer, primary_key=True)
    # So Article block can bet infinitely nested
    # but because they all have the page id, we do not need
    # to do recursive query we can query everything one shot
    # and let the render fetch from the list of results
    page_id = Column(Integer, ForeignKey('articles._id'), nullable=True)
    parent = Column(Integer, ForeignKey('article_blocks._id'), nullable=True)
    children = Column(JSON)

    kind = Column(String, 25)
    data = Column(JSON)
    extension = Column(JSON)

    # Some nodes can be just data blocks ?


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
