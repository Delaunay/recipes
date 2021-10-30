#!/usr/bin/env python
from setuptools import setup


if __name__ == '__main__':
    setup(
        name='recipes',
        version='0.0.0',
        description=' ',
        author='Pierre Delaunay',
        packages=[
            'recipes',
        ],
        setup_requires=['setuptools'],
        tests_require=['pytest', 'flake8', 'codecov', 'pytest-cov'],
    )
