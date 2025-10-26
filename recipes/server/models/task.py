from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Table, Text, UniqueConstraint, JSON, create_engine, select, Boolean, Index
from sqlalchemy.orm import relationship, sessionmaker, declarative_base

from .common import Base


class Task(Base):
    __tablename__ = 'tasks'

    _id = Column(Integer, primary_key=True)

    title = Column(String(100), nullable=False)
    description = Column(Text)
    datetime_deadline = Column(DateTime)
    datetime_done = Column(DateTime)
    done = Column(Boolean, default=False)
    priority = Column(Integer, default=0)

    # Budgeting
    price_budget = Column(Float)
    price_real = Column(Float)
    people_count = Column(Integer)

    # Template Task
    template = Column(Boolean, default=False)
    recuring = Column(Boolean, default=False)
    active = Column(Boolean, default=True)

    #
    extension = Column(JSON)

    # Relationships
    parent_subtasks = relationship('SubTask', foreign_keys='SubTask.parent_id', back_populates='parent')
    child_subtasks = relationship('SubTask', foreign_keys='SubTask.child_id', back_populates='child')

    def __repr__(self):
        return f'<Task {self.title}>'

    def to_json(self):
        return {
            'id': self._id,
            'title': self.title,
            'description': self.description,
            'datetime_deadline': self.datetime_deadline.isoformat() if self.datetime_deadline else None,
            'done': self.done,
            'price_budget': self.price_budget,
            'price_real': self.price_real,
            'people_count': self.people_count,
            'template': self.template,
            'recuring': self.recuring,
            'active': self.active,
            'extension': self.extension,
            "priority": self.priority if self.priority is not None else 0
        }


class SubTask(Base):
    __tablename__ = 'substasks'

    _id = Column(Integer, primary_key=True)
    parent_id = Column(Integer, ForeignKey('tasks._id'), nullable=False)
    child_id = Column(Integer, ForeignKey('tasks._id'), nullable=False)

    # Relationships
    parent = relationship('Task', foreign_keys=[parent_id], back_populates='child_subtasks')
    child = relationship('Task', foreign_keys=[child_id], back_populates='parent_subtasks')

    def __repr__(self):
        return f'<SubTask parent={self.parent_id} child={self.child_id}>'

    def to_json(self):
        return {
            'id': self._id,
            'parent_id': self.parent_id,
            'child_id': self.child_id
        }
