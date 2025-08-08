
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

static-build:
	(. website/.venv/bin/activate; VITE_USE_STATIC_MODE=true FLASK_STATIC=website python scripts/static_generator.py)

static:
	cd static_build && python -m http.server

# flask --app recipes.server.run:main 

local-deploy:
	cd recipes/website
	python3 -m venv .venv
	source .venv/bin/activate
	pip install -r ../requirements.txt
	pip install waitress
	pip install ../
	npm install --prefix ../recipes/ui
	npm run build --prefix  ../recipes/ui
	mv ../recipes/ui/dist ./static
	python -c 'import secrets; print(f"SECRET_KEY = \"{secrets.token_hex()}\"")' > .venv/var/flaskr-instance/config.py
	FLASK_STATIC="./static" FLASK_ENV=production waitress-serve --call 'recipes.server.run:main'

	
preprocess-images:
	(. website/.venv/bin/activate; VITE_USE_STATIC_MODE=true FLASK_STATIC=website python scripts/static_generator.py)
