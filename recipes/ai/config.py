"""Configuration system for assai.

Values are resolved in priority order:
    1. Environment variables (ASSAI_ prefix, e.g. ASSAI_LLM_BACKEND)
    2. Config file values (YAML)
    3. Dataclass defaults

Usage::

    from assai.config import load_config, AssaiConfig

    load_config("config.yaml")
    config = AssaiConfig()
"""

import contextvars
import os
from contextlib import contextmanager
from copy import deepcopy
from dataclasses import dataclass, field


config_global = contextvars.ContextVar("assai_config", default=None)

ENV_PREFIX = "ASSAI"


def getenv(name, expected_type):
    value = os.getenv(name)
    if value is None:
        return None
    if expected_type is bool:
        return value.lower() in ("1", "true", "yes")
    try:
        return expected_type(value)
    except (TypeError, ValueError):
        return None


def as_env_var(name):
    return ENV_PREFIX + "_" + name.replace(".", "_").upper()


def select(*args):
    """Return the first truthy non-None value."""
    prev = []
    for val in args:
        if val is not None:
            prev.append(val)
        if val:
            return val
    if prev:
        return prev[0]
    return None


def option(name, etype, default=None):
    """Resolve a config value from env var, config dict, or default."""
    config = config_global.get() or {}

    frags = name.split(".")
    env_name = as_env_var(name)
    env_value = getenv(env_name, etype)

    lookup = config
    for frag in frags[:-1]:
        lookup = lookup.get(frag, {}) if isinstance(lookup, dict) else {}
    config_value = lookup.get(frags[-1], None) if isinstance(lookup, dict) else None

    final_value = select(env_value, config_value, default)

    if final_value is None:
        return None
    try:
        return etype(final_value)
    except (ValueError, TypeError):
        return None


def defaultfield(name, etype, default=None):
    """Dataclass field whose default is resolved via ``option()`` at instantiation."""
    return field(default_factory=lambda: option(name, etype, default))


@contextmanager
def apply_config(overrides: dict):
    """Temporarily overlay config values."""
    config = config_global.get()
    old = deepcopy(config)

    if config is None:
        config = {}
        config_global.set(config)
        config = config_global.get()

    for k, v in overrides.items():
        frags = k.split(".")
        lookup = config
        for f in frags[:-1]:
            lookup = lookup.setdefault(f, {})
        lookup[frags[-1]] = v

    yield
    config_global.set(old)


def load_config(config_file=None):
    """Load a YAML config file and set it as the global config."""
    if config_file is None:
        config = {}
    else:
        import yaml

        with open(config_file) as f:
            config = yaml.safe_load(f) or {}

    config_global.set(config)
    return config


def show_config(config_obj, depth=0):
    """Print the current config for debugging."""
    from dataclasses import fields as dc_fields, is_dataclass

    if not is_dataclass(config_obj):
        return

    for f in dc_fields(config_obj):
        val = getattr(config_obj, f.name)
        indent = "  " * depth

        if is_dataclass(val):
            print(f"{indent}{f.name}:")
            show_config(val, depth + 1)
        else:
            env_hint = as_env_var(f.name) if depth == 0 else ""
            print(f"{indent}{f.name:<24}: {val!s:<40} {env_hint}")


# ---------------------------------------------------------------------------
# Config dataclasses
# ---------------------------------------------------------------------------

@dataclass
class ScribeConfig:
    trigger: str = defaultfield("scribe.trigger", str, "event")
    specs_dir: str = defaultfield("scribe.specs_dir", str, "specs")


@dataclass
class CuratorConfig:
    strategy: str = defaultfield("curator.strategy", str, "references")


@dataclass
class WorkerConfig:
    max_retries: int = defaultfield("worker.max_retries", int, 3)
    sandbox: str = defaultfield("worker.sandbox", str, "container")
    timeout: int = defaultfield("worker.timeout", int, 300)


@dataclass
class GitConfig:
    repo_path: str = defaultfield("git.repo_path", str, ".")
    worktree_dir: str = defaultfield("git.worktree_dir", str, ".worktrees")
    auto_commit: bool = defaultfield("git.auto_commit", bool, True)


@dataclass
class QueueConfig:
    url: str = defaultfield("queue.url", str, "sqlite:///work.db")
    poll_interval: int = defaultfield("queue.poll_interval", int, 5)


@dataclass
class LLMConfig:
    backend: str = defaultfield("llm.backend", str, "openai")
    model: str = defaultfield("llm.model", str, "")
    endpoint: str = defaultfield("llm.endpoint", str, "http://127.0.0.1:9123")
    max_tokens: int = defaultfield("llm.max_tokens", int, 4096)
    temperature: float = defaultfield("llm.temperature", float, 0.7)
    api_key: str = defaultfield("llm.api_key", str, "")


@dataclass
class AssaiConfig:
    scribe: ScribeConfig = field(default_factory=ScribeConfig)
    curator: CuratorConfig = field(default_factory=CuratorConfig)
    worker: WorkerConfig = field(default_factory=WorkerConfig)
    git: GitConfig = field(default_factory=GitConfig)
    queue: QueueConfig = field(default_factory=QueueConfig)
    llm: LLMConfig = field(default_factory=LLMConfig)
