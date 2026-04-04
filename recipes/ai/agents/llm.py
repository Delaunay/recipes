"""Unified LLM interface for agent use.

All agents talk to models through this abstraction.  The default
implementation speaks the OpenAI-compatible ``/v1/chat/completions``
protocol, which covers OpenAI, llama.cpp, vLLM, and any compatible
endpoint.
"""

from __future__ import annotations

import json
from typing import Generator

import requests


class LLM:
    """Base class — override ``complete`` / ``stream`` for new backends."""

    def complete(self, messages: list[dict], **kwargs) -> str:
        raise NotImplementedError

    def stream(self, messages: list[dict], **kwargs) -> Generator[str, None, None]:
        raise NotImplementedError


class OpenAICompatibleLLM(LLM):
    """Talks to any OpenAI-compatible endpoint (OpenAI, llama.cpp, vLLM)."""

    def __init__(self, endpoint: str, model: str = "",
                 max_tokens: int = 4096, temperature: float = 0.7,
                 api_key: str = "", timeout: int = 300):
        self.endpoint = endpoint.rstrip("/")
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.api_key = api_key
        self.timeout = timeout

    def _headers(self):
        h = {"Content-Type": "application/json"}
        if self.api_key:
            h["Authorization"] = f"Bearer {self.api_key}"
        return h

    def _payload(self, messages, stream=False, **kwargs):
        return {
            "model": kwargs.get("model", self.model),
            "messages": messages,
            "temperature": kwargs.get("temperature", self.temperature),
            "max_tokens": kwargs.get("max_tokens", self.max_tokens),
            "stream": stream,
        }

    def complete(self, messages, **kwargs):
        payload = self._payload(messages, stream=False, **kwargs)
        resp = requests.post(
            f"{self.endpoint}/v1/chat/completions",
            json=payload,
            headers=self._headers(),
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]

    def stream(self, messages, **kwargs):
        payload = self._payload(messages, stream=True, **kwargs)
        resp = requests.post(
            f"{self.endpoint}/v1/chat/completions",
            json=payload,
            headers=self._headers(),
            stream=True,
            timeout=self.timeout,
        )
        resp.raise_for_status()

        for line in resp.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data: "):
                continue
            data_str = line[6:]
            if data_str.strip() == "[DONE]":
                break
            try:
                data = json.loads(data_str)
                content = (
                    data.get("choices", [{}])[0]
                    .get("delta", {})
                    .get("content", "")
                )
                if content:
                    yield content
            except (json.JSONDecodeError, IndexError):
                continue


def create_llm(config) -> LLM:
    """Factory: build an LLM from an ``LLMConfig``."""
    if config.backend in ("openai", "llamacpp", "vllm", "local"):
        return OpenAICompatibleLLM(
            endpoint=config.endpoint,
            model=config.model,
            max_tokens=config.max_tokens,
            temperature=config.temperature,
            api_key=config.api_key,
        )
    raise ValueError(f"Unknown LLM backend: {config.backend}")
