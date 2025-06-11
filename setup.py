#!/usr/bin/env python
import os
from pathlib import Path

from setuptools import setup


version = '0.0.1'

extra_requires = {"plugins": ["importlib_resources"],}
extra_requires["all"] = sorted(set(sum(extra_requires.values(), [])))


if __name__ == "__main__":
    setup(
        name="recipes",
        version=version,
        extras_require=extra_requires,
        description="",
        long_description=(Path(__file__).parent / "README.rst").read_text(),
        author="Gamekit",
        author_email="github@gamekit.ca",
        license="MIT",
        url="https://recipes.readthedocs.io",
        classifiers=[
            "License :: OSI Approved :: BSD License",
            "Programming Language :: Python :: 3.7",
            "Programming Language :: Python :: 3.8",
            "Programming Language :: Python :: 3.9",
            "Operating System :: OS Independent",
        ],
        packages=[
            "recipes.server",
            # "recipes.recipes",
            #   "recipes.recipes.migrations",
            # "recipes.recipes.templatetags",
        ],
        setup_requires=["setuptools"],
        install_requires=["importlib_resources"],
    )
