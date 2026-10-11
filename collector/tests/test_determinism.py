import dataclasses
import os
import random
import subprocess
import sys
from datetime import timedelta, timezone

from arc_collector.summary import to_json

from .conftest import ROOT


def test_two_runs_are_byte_identical(run, base_messages):
    assert to_json(run(base_messages)) == to_json(run(base_messages))


def test_input_order_does_not_matter(run, base_messages, base_summary):
    for seed in range(25):
        shuffled = list(base_messages)
        random.Random(seed).shuffle(shuffled)
        assert run(shuffled) == base_summary


def test_timezone_offsets_do_not_matter(run, base_messages, base_summary):
    tokyo = timezone(timedelta(hours=9))
    moved = [dataclasses.replace(m, date=m.date.astimezone(tokyo)) for m in base_messages]
    assert run(moved) == base_summary


def _cli(tz: str, seed: int) -> str:
    env = {**os.environ, "TZ": tz, "PYTHONHASHSEED": str(seed)}  # different hash seed each run
    proc = subprocess.run(
        [
            sys.executable,
            "-m",
            "arc_collector.cli",
            "--token",
            "DEMO",
            "--fixtures",
            "fixtures/base",
            "--registry",
            "fixtures/registry.json",
            "--as-of",
            "2026-10-10T12:00:00Z",
        ],
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
        check=True,
    )
    return proc.stdout


def test_cli_output_identical_across_hash_seeds_and_tz_setting():
    # TZ is ignored by Windows (the collector never reads local time anyway); the hash seeds
    # still vary set/dict ordering, which is the part this guards.
    a, b, c = _cli("UTC", 1), _cli("Asia/Tokyo", 2), _cli("America/Chicago", 3)
    assert a == b == c
    assert a.endswith("\n")
