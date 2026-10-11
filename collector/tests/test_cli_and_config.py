import json

import pytest

from arc_collector.cli import main
from arc_collector.token import TokenConfigError, load_token

from .conftest import DEMO_CA, ROOT

COMMON = [
    "--token",
    "DEMO",
    "--fixtures",
    str(ROOT / "fixtures" / "base"),
    "--registry",
    str(ROOT / "fixtures" / "registry.json"),
    "--policy",
    str(ROOT / "data" / "policy.json"),
    "--token-config",
    str(ROOT / "data" / "tokens" / "demo.json"),
]


def test_cli_success(capsys):
    assert main([*COMMON, "--as-of", "2026-10-10T12:00:00Z"]) == 0
    out = json.loads(capsys.readouterr().out)
    assert out["totals"]["weighted_score"] == 2.2


def test_cli_matches_golden(capsys):
    assert main([*COMMON, "--as-of", "2026-10-10T12:00:00Z"]) == 0
    golden = (ROOT / "tests" / "golden" / "base_summary.json").read_text(encoding="utf-8")
    assert capsys.readouterr().out == golden


@pytest.mark.parametrize(
    "extra",
    [
        ["--as-of", "tomorrow"],
        ["--as-of", "2026-10-10T12:00:00"],
        ["--as-of", "2026-10-10T12:00:00Z", "--registry", "missing.json"],
        ["--as-of", "2026-10-10T12:00:00Z", "--policy", "missing.json"],
        ["--as-of", "2026-10-10T12:00:00Z", "--fixtures", "missing-folder-x"],
    ],
)
def test_cli_errors_exit_2(capsys, extra):
    assert main([*COMMON, *extra]) == 2
    assert "error:" in capsys.readouterr().err


def test_cli_token_mismatch(capsys):
    args = [*COMMON, "--as-of", "2026-10-10T12:00:00Z"]
    args[1] = "XYZ"
    assert main(args) == 2


def test_token_config_validation(tmp_path):
    def write(data):
        p = tmp_path / "t.json"
        p.write_text(json.dumps(data))
        return p

    with pytest.raises(TokenConfigError):
        load_token(write({"ticker": "DEMO"}))
    with pytest.raises(TokenConfigError, match="address"):
        load_token(write({"ticker": "DEMO", "chain": "arc", "contract_addresses": ["nope"]}))
    with pytest.raises(TokenConfigError, match="ASCII"):
        load_token(write({"ticker": "D\u0415MO", "chain": "arc", "contract_addresses": [DEMO_CA]}))
    token = load_token(
        write(
            {
                "ticker": "demo",
                "chain": "arc",
                "contract_addresses": [DEMO_CA.upper().replace("0X", "0x")],
                "aliases": ["demox", "DEMO"],
            }
        )
    )
    assert token.ticker == "DEMO"
    assert token.aliases == ("DEMOX",)
    assert token.tags == {"DEMO", "DEMOX"}


@pytest.mark.parametrize(
    ("config", "match"),
    [
        ({"ticker": "1INCH", "chain": "arc", "contract_addresses": []}, "starting with a letter"),
        ({"ticker": "TOOLONGTICKER", "chain": "arc", "contract_addresses": []}, "2-10"),
        ({"ticker": "DEMO", "chain": "Arc Chain", "contract_addresses": []}, "chain"),
        (
            {"ticker": "DEMO", "chain": "arc", "contract_addresses": [], "aliases": ["9X"]},
            "aliases",
        ),
    ],
)
def test_token_shape_is_checked_up_front(tmp_path, config, match):
    p = tmp_path / "t.json"
    p.write_text(json.dumps(config))
    with pytest.raises(TokenConfigError, match=match):
        load_token(p)


def test_invalid_json_token_config_is_a_clean_error(tmp_path, capsys):
    bad = tmp_path / "bad.json"
    bad.write_text("{oops")
    args = [*COMMON, "--as-of", "2026-10-10T12:00:00Z"]
    args[args.index("--token-config") + 1] = str(bad)
    assert main(args) == 2
    assert "not valid JSON" in capsys.readouterr().err


@pytest.mark.parametrize("hours", ["0", "-5", "99999999999", "abc"])
def test_window_hours_is_validated(hours, capsys):
    with pytest.raises(SystemExit) as exit_info:
        main([*COMMON, "--as-of", "2026-10-10T12:00:00Z", "--window-hours", hours])
    assert exit_info.value.code == 2


def test_address_option_needs_no_config_file(capsys):
    args = [
        "--token",
        "DEMO",
        "--address",
        DEMO_CA,
        "--fixtures",
        str(ROOT / "fixtures" / "base"),
        "--registry",
        str(ROOT / "fixtures" / "registry.json"),
        "--policy",
        str(ROOT / "data" / "policy.json"),
        "--as-of",
        "2026-10-10T12:00:00Z",
    ]
    assert main(args) == 0
    golden = (ROOT / "tests" / "golden" / "base_summary.json").read_text(encoding="utf-8")
    assert capsys.readouterr().out == golden  # same result as the config-file route


def test_address_option_validates(capsys):
    args = [
        "--token",
        "DEMO",
        "--address",
        "0x123",
        "--fixtures",
        str(ROOT / "fixtures" / "base"),
        "--as-of",
        "2026-10-10T12:00:00Z",
    ]
    assert main(args) == 2
    assert "contract address" in capsys.readouterr().err


def test_real_usdc_example_config_loads():
    token = load_token(ROOT / "data" / "tokens" / "usdc.json")
    assert (token.ticker, token.chain) == ("USDC", "arc")
    assert token.contract_addresses == ("0x3600000000000000000000000000000000000000",)


def test_as_of_now_uses_the_current_utc_time(capsys):
    from datetime import UTC, datetime

    args = [*COMMON, "--as-of", "now"]
    assert main(args) == 0
    stamp = json.loads(capsys.readouterr().out)["as_of"]
    moment = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
    assert abs((datetime.now(UTC) - moment).total_seconds()) < 120


def test_as_of_now_is_case_insensitive_and_bad_values_still_fail(capsys):
    assert main([*COMMON, "--as-of", " NOW "]) == 0
    capsys.readouterr()
    assert main([*COMMON, "--as-of", "later"]) == 2


def test_explain_shows_what_was_found_but_never_the_text(capsys):
    args = [*COMMON, "--as-of", "2026-10-10T12:00:00Z", "--explain"]
    assert main(args) == 0
    captured = capsys.readouterr()
    assert json.loads(captured.out)["totals"]["weighted_score"] == 2.2  # stdout is unchanged
    lines = [line for line in captured.err.splitlines() if line.startswith("message ")]
    assert len(lines) == 16  # every message the source delivered, mentions or not
    assert any('"result": "confirmed"' in line for line in lines)
    assert any('"result": "not a mention"' in line for line in lines)
    for secret in ("Listing notice", "to the moon", "nothing on this token", "Market wrap"):
        assert secret not in captured.err
