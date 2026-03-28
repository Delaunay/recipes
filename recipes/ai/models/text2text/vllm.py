import os
import subprocess
from subprocess import Popen
import threading
import time
import requests
import json
import sys
from typing import List, Dict, Optional, Union, Iterator, Generator


model_id = ["vllm/mistralai/Mistral-Small-3.1-24B-Instruct-2503"]

DEFAULT_MODEL = "mistralai/Mistral-Small-3.1-24B-Instruct-2503"
DEFAULT_PORT = 9124
DEFAULT_HOST = "127.0.0.1"


def server_arguments(model=DEFAULT_MODEL, host=DEFAULT_HOST, port=DEFAULT_PORT):
    """Generate arguments for vLLM OpenAI API server"""
    return [
        "--model", model,
        "--host", host,
        "--port", str(port),
        "--tensor-parallel-size", "1",
        "--max-model-len", "16384",
        "--gpu-memory-utilization", "0.9",
        "--trust-remote-code",
    ]


def _format_conversation(messages: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Format conversation for OpenAI-compatible API (messages format)"""
    # The server handles chat template formatting, so we just need to pass messages
    # in the standard format: [{"role": "user", "content": "..."}, ...]
    formatted = []
    for message in messages:
        role = message.get("role", "user")
        content = message.get("content", "")
        formatted.append({"role": role, "content": content})
    return formatted


class ModelProcess:
    def __init__(self, model_id, host=DEFAULT_HOST, port=DEFAULT_PORT):
        self.model_id = model_id if isinstance(model_id, str) else DEFAULT_MODEL
        self.host = str(host).strip()
        self.port = int(port)  # Ensure port is an integer
        # Construct base_url with explicit string conversion to avoid any parsing issues
        self.base_url = f"http://{self.host}:{self.port}"
        self.proc = None
        self.lock = threading.Lock()
        self.model_name = None  # Will be set after server starts
        self._start_server()

    def _start_server(self):
        """Start the vLLM OpenAI API server process"""
        # Find Python executable
        python_exec = sys.executable

        # Check if vllm is available
        try:
            import vllm
        except ImportError:
            raise ImportError(
                "vLLM is not installed. Please install it with: pip install vllm"
            )

        cmd = [python_exec, "-m", "vllm.entrypoints.openai.api_server"] + server_arguments(
            self.model_id, self.host, self.port
        )

        # Start server process
        self.proc = Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        # Wait for server to be ready
        self._wait_for_server()

    def _wait_for_server(self, timeout=120):
        """Wait for the server to be ready by checking the /health endpoint"""
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                # Try to connect to the server - /health returns 200 when ready
                url = f"{self.base_url}/health"
                response = requests.get(url, timeout=2)
                if response.status_code == 200:
                    # Server is ready - cache the model name
                    # Try to get model info from /v1/models endpoint
                    try:
                        models_url = f"{self.base_url}/v1/models"
                        models_response = requests.get(models_url, timeout=2)
                        if models_response.status_code == 200:
                            models_data = models_response.json()
                            if "data" in models_data and len(models_data["data"]) > 0:
                                self.model_name = models_data["data"][0].get("id", self.model_id)
                            else:
                                self.model_name = self.model_id
                        else:
                            self.model_name = self.model_id
                    except:
                        self.model_name = self.model_id
                    return
            except requests.exceptions.InvalidURL as e:
                raise ValueError(
                    f"Invalid URL constructed: {self.base_url}. "
                    f"Port {self.port} may be out of valid range (0-65535). "
                    f"Original error: {e}"
                ) from e
            except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
                pass

            # Check if process died
            if self.proc.poll() is not None:
                stderr_output = ""
                if self.proc.stderr:
                    try:
                        stderr_output = self.proc.stderr.read()
                    except:
                        pass
                raise RuntimeError(
                    f"vLLM server process died with return code {self.proc.returncode}. "
                    f"Stderr: {stderr_output}"
                )

            time.sleep(0.5)

        raise RuntimeError(f"vLLM server did not become ready within {timeout} seconds")

    def _stream_response(self, response: requests.Response) -> Generator[str, None, None]:
        """
        Parse Server-Sent Events (SSE) stream from vLLM server.

        Yields:
            Generated text tokens as they arrive
        """
        for line in response.iter_lines(decode_unicode=True):
            if not line:
                continue

            # SSE format: "data: {json}\n\n"
            if line.startswith("data: "):
                data_str = line[6:]  # Remove "data: " prefix

                # Handle [DONE] marker
                if data_str.strip() == "[DONE]":
                    break

                try:
                    data = json.loads(data_str)
                    # Extract content from the choice
                    if "choices" in data and len(data["choices"]) > 0:
                        choice = data["choices"][0]
                        delta = choice.get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content

                        # Check if this is the final chunk
                        if choice.get("finish_reason"):
                            break
                except json.JSONDecodeError:
                    # Skip malformed JSON
                    continue

    def stream(self, prompt_or_conversation: Union[str, List[Dict[str, str]]], **kwargs) -> Generator[str, None, None]:
        """
        Stream inference results in real-time.

        Args:
            prompt_or_conversation: Either:
                - A string (single prompt)
                - A list of dicts with 'role' and 'content' keys (conversation)
            **kwargs: Additional generation parameters (same as __call__)

        Yields:
            Generated text tokens as they arrive
        """
        kwargs["stream"] = True
        return self.__call__(prompt_or_conversation, **kwargs)

    def __call__(self, prompt_or_conversation: Union[str, List[Dict[str, str]]], **kwargs):
        """
        Run inference on the provided prompt or conversation.

        Args:
            prompt_or_conversation: Either:
                - A string (single prompt)
                - A list of dicts with 'role' and 'content' keys (conversation)
            **kwargs: Additional generation parameters:
                - temperature: float (default: 0.7)
                - top_p: float (default: 0.9)
                - max_tokens: int (default: 2048)
                - stop: List[str] (default: [])
                - etc.

        Returns:
            Generated text as a string or generator if streaming.
        """
        with self.lock:
            # Check if process is still alive
            if self.proc.poll() is not None:
                # Process died, restart it
                self._start_server()

            # Prepare messages for API
            if isinstance(prompt_or_conversation, str):
                # Single prompt - send as user message
                messages = [{"role": "user", "content": prompt_or_conversation}]
            elif isinstance(prompt_or_conversation, list):
                # Use conversation format directly
                messages = _format_conversation(prompt_or_conversation)
            else:
                raise ValueError(
                    "prompt_or_conversation must be a string or list of message dicts"
                )

            # Use cached model name or fallback
            model_name = self.model_name or self.model_id

            # Prepare request payload
            payload = {
                "model": model_name,
                "messages": messages,
                "temperature": kwargs.get("temperature", 0.7),
                "top_p": kwargs.get("top_p", 0.9),
                "max_tokens": kwargs.get("max_tokens", kwargs.get("max_new_tokens", 2048)),
            }

            # Add optional parameters
            if "stop" in kwargs:
                payload["stop"] = kwargs["stop"]
            if "seed" in kwargs:
                payload["seed"] = kwargs["seed"]
            if "top_k" in kwargs:
                payload["top_k"] = kwargs["top_k"]
            if "repetition_penalty" in kwargs:
                payload["repetition_penalty"] = kwargs["repetition_penalty"]

            # Handle streaming mode
            stream = kwargs.get("stream", False)
            payload["stream"] = stream

            # Make request to chat completions endpoint
            try:
                response = requests.post(
                    f"{self.base_url}/v1/chat/completions",
                    json=payload,
                    stream=stream,  # Enable streaming for requests library
                    timeout=300  # 5 minute timeout
                )
                response.raise_for_status()

                # Handle streaming response
                if stream:
                    # Return a generator that yields tokens
                    return self._stream_response(response)

                # Handle non-streaming response
                result = response.json()

                # Extract generated text from response
                if "choices" in result and len(result["choices"]) > 0:
                    generated_text = result["choices"][0]["message"]["content"]
                    return generated_text
                else:
                    raise ValueError(f"Unexpected response format: {result}")

            except requests.exceptions.RequestException as e:
                # If connection error, try restarting server once
                if isinstance(e, (requests.exceptions.ConnectionError, requests.exceptions.Timeout)):
                    self.model_name = None  # Reset model name to be re-fetched
                    self._start_server()
                    # Update model name in payload
                    payload["model"] = self.model_name or self.model_id
                    # Retry once
                    response = requests.post(
                        f"{self.base_url}/v1/chat/completions",
                        json=payload,
                        stream=stream,  # Preserve streaming mode
                        timeout=300
                    )
                    response.raise_for_status()

                    # Handle streaming retry
                    if stream:
                        return self._stream_response(response)

                    # Handle non-streaming retry
                    result = response.json()
                    if "choices" in result and len(result["choices"]) > 0:
                        generated_text = result["choices"][0]["message"]["content"]
                        return generated_text

                raise RuntimeError(f"Request to vLLM server failed: {e}")

    def __del__(self):
        """Clean up: stop the server process"""
        if self.proc and self.proc.poll() is None:
            self.proc.terminate()
            try:
                self.proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.proc.kill()


def load(model_name):
    model = ModelProcess(model_name)
    return model

