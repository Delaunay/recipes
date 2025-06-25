
install:
	pip install -e .[all]
	pip install -r requirements.txt
	pip install -r docs/requirements.txt
	pip install -r tests/requirements.txt

doc: build-doc

build-doc:
	sphinx-build -W --color -c docs/ -b html docs/ _build/html

serve-doc:
	sphinx-serve

update-doc: build-doc serve-doc

tests-doc:
	COVERAGE_FILE=.coverage.docstring coverage run --parallel-mode -m pytest --cov=recipes --doctest-modules recipes

tests-integration:
	COVERAGE_FILE=.coverage.integration coverage run --parallel-mode -m pytest --cov=recipes tests/integration

tests-end-to-end:
	COVERAGE_FILE=.coverage.end2end coverage run --parallel-mode -m pytest --cov=recipes tests/end2end

tests-unit:
	COVERAGE_FILE=.coverage.unit coverage run --parallel-mode -m pytest --cov=recipes tests/unit

tests-combine:
	coverage combine
	coverage report -m
	coverage xml

tests-codecov: tests-combine
	codecov

tests-all: tests-doc tests-unit tests-integration tests-end-to-end

tests: tests-all tests-codecov


CONDA_ACTIVATE=. $$(conda info --base)/etc/profile.d/conda.sh ; conda activate

front:
	cd recipes/ui && npm run dev

back:
	($(CONDA_ACTIVATE) py310; python -m recipes.server.run)


alembic_gen:
	cd recipes/alembic && alembic revision -m "create account table"

alembic-autogen:
	cd recipes/alembic && alembic revision --autogenerate -m "makefile"

alembic-update:
	cd recipes/alembic && alembic upgrade head

