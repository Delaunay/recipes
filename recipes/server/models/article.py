from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Table, Text, UniqueConstraint, JSON, create_engine, select, Boolean, Index
from sqlalchemy.orm import relationship, sessionmaker, declarative_base

from .common import Base


class Article(Base):
    """Full blog post to display"""
    __tablename__ = 'articles'

    _id = Column(Integer, primary_key=True)
    root_id = Column(Integer, ForeignKey('articles._id'), nullable=True)
    parent = Column(Integer, ForeignKey('articles._id'), nullable=True)

    title = Column(String(50))
    namespace = Column(String(255))
    tags = Column(JSON)
    extension = Column(JSON)

    # Add a view counter for optimizing UX display view

    @staticmethod
    def get_article_forest(session, articles):
        article_ids = [a["id"] for a in articles]

        nodes = (
            session.query(ArticleBlock)
            .filter(ArticleBlock.page_id.in_(article_ids))
            .order_by(ArticleBlock._id.asc())
            .all()
        )

        if len(nodes) == 0:
            return articles

        parents = {}
        roots = []
        children = []

        for node in nodes:
            if node.parent is None or node.parent == node._id:
                obj = node.to_json()
                parents[node._id] = obj
                roots.append(obj)

                # Add the root blocks to the article
                for a in articles:
                    if a["id"] == node.page_id:
                        a["blocks"].append(obj)
            else:
                children.append(node)

        assert len(roots) == len(articles), f"All roots should have been fetched {len(roots)} {len(articles)} {len(nodes)} {len(children)}"

        # If the query order by task_id, it should do this loop in a single pass
        # because parent need to be created first so their _id will be smaller
        # than the children
        while len(children) > 0:
            missed = []
            for block in children:
                parent = parents.get(block.parent)

                if parent is not None:
                    obj = block.to_json()
                    parent.setdefault("children", []).append(obj)
                    parents[block._id] = obj
                else:
                    missed.append(task)

            children = missed
            assert len(children) == 0, "All the children should have been sorted correctly"

        return articles

    @staticmethod
    def get_article_tree(session, article_id):
        return Article.get_article_forest(session, article_ids=[article_id])[0]

    def to_json(self, session=None, children=False):
        this = {
            'id': self._id,
            "title":self.title,
            "namespace": self.namespace,
            "tags": self.tags,
            "extension": self.extension,
            "parent_id": self.parent,
            "root_id": self.root_id,
            "blocks": []
        }

        if session and children:
            block_list = (
                session.query(ArticleBlock)
                .filter(ArticleBlock.page_id == self._id)
                .order_by(ArticleBlock._id.asc())
                .all()
            )

        return this

#
# Data block could be reused on multiple articles ?
#
# class DataBlock(Base):
#     pass
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

    kind = Column(String(25))
    data = Column(JSON)
    extension = Column(JSON)

    # Some nodes can be just data blocks ?
    def to_json(self):
        return {
            'id': self._id,
            'page_id': self.page_id,
            'parent_id': self.parent,
            'kind': self.kind,
            'data': self.data,
            'extension': self.extension,
        }