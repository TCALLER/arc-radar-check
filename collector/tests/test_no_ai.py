"""Telegram's terms restrict AI/ML processing of channel content: the pipeline must contain none."""

import ast

from .conftest import ROOT

SRC = ROOT / "src" / "arc_collector"
AI_MODULES = {
    "anthropic",
    "openai",
    "cohere",
    "mistralai",
    "ollama",
    "litellm",
    "langchain",
    "llama_index",
    "transformers",
    "torch",
    "tensorflow",
    "sklearn",
    "spacy",
    "nltk",
    "sentence_transformers",
    "google.generativeai",
    "google.genai",
    "vertexai",
    "huggingface_hub",
    "groq",
    "replicate",
}

NETWORK_MODULES = {"urllib.request", "urllib.error"}  # urllib.parse is plain string parsing
NETWORK_ROOTS = {"http", "socket", "requests", "httpx", "aiohttp"}


def imported_modules(path):
    tree = ast.parse(path.read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                yield alias.name
        elif isinstance(node, ast.ImportFrom) and node.module and not node.level:
            yield node.module


def test_no_ai_or_ml_library_is_imported_anywhere():
    for path in SRC.glob("*.py"):
        for module in imported_modules(path):
            assert module.split(".")[0] not in {m.split(".")[0] for m in AI_MODULES}, (
                path.name,
                module,
            )


def test_no_ai_dependency_is_declared():
    toml = (ROOT / "pyproject.toml").read_text(encoding="utf-8").lower()
    for name in ("anthropic", "openai", "langchain", "transformers", "torch", "cohere"):
        assert name not in toml


def test_only_the_bot_source_touches_the_network():
    for path in SRC.glob("*.py"):
        mods = set(imported_modules(path))
        network = {m for m in mods if m in NETWORK_MODULES or m.split(".")[0] in NETWORK_ROOTS}
        if path.name != "botsource.py":
            assert not network, (path.name, network)
