"""Bot API source tests use a fake transport: no network, no token, no Telegram account."""

import json
from datetime import UTC, datetime

import pytest

from arc_collector.botsource import (
    BotApiSource,
    clean_bot_token,
    http_transport,
    update_to_message,
)
from arc_collector.cli import main
from arc_collector.sources import SourceError

from .conftest import DEMO_CA, ROOT

TS = int(datetime(2026, 10, 9, 12, tzinfo=UTC).timestamp())
WINDOW = (datetime(2026, 10, 8, tzinfo=UTC), datetime(2026, 10, 10, tzinfo=UTC))


def post(uid, mid, text, chat=None, **extra):
    chat = chat or {"id": -100, "type": "supergroup", "title": "Bot Test Group"}
    return {
        "update_id": uid,
        "message": {"message_id": mid, "date": TS, "chat": chat, "text": text, **extra},
    }


class FakeTransport:
    def __init__(self, pages):
        self.pages = list(pages)
        self.calls = []

    def __call__(self, token, method, payload):
        self.calls.append((token, method, payload))
        return {"ok": True, "result": self.pages.pop(0) if self.pages else []}


def test_messages_are_converted():
    m = update_to_message(post(1, 7, f"$DEMO {DEMO_CA} https://example.com/x"))
    assert (m.channel, m.message_id, m.date) == (
        "chat-100",
        "7",
        datetime.fromtimestamp(TS, UTC),
    )
    assert m.text.startswith("$DEMO")


def test_username_is_the_channel_identity():
    chat = {"id": -1, "type": "channel", "title": "Pretty Title", "username": "pretty_handle"}
    assert update_to_message(post(1, 1, "x", chat)).channel == "pretty_handle"


def test_entities_use_utf16_offsets():
    text = "\U0001f680 see https://example.com/a now"  # rocket is 2 UTF-16 units
    ent = {"type": "url", "offset": 7, "length": 21}
    m = update_to_message(
        post(1, 1, text, entities=[ent, {"type": "bold", "offset": 0, "length": 2}])
    )
    assert [e.text for e in m.entities] == ["https://example.com/a"]


def test_text_link_keeps_href():
    ent = {"type": "text_link", "offset": 0, "length": 4, "url": "https://evil.example/x"}
    assert (
        update_to_message(post(1, 1, "Real site", entities=[ent])).entities[0].href
        == "https://evil.example/x"
    )


def test_forward_and_edit_fields():
    fwd = {
        "type": "channel",
        "chat": {"id": -5, "type": "channel", "username": "origin"},
        "message_id": 42,
    }
    m = update_to_message(post(1, 1, "x", forward_origin=fwd, edit_date=TS + 60))
    assert (m.forwarded_from.channel, m.forwarded_from.message_id) == ("origin", "42")
    assert m.edited == datetime.fromtimestamp(TS + 60, UTC)


@pytest.mark.parametrize(
    "update",
    [
        {"update_id": 1},
        {
            "update_id": 1,
            "message": {
                "message_id": 1,
                "date": TS,
                "chat": {"id": 1, "type": "private", "title": "x"},
                "text": "t",
            },
        },
        {
            "update_id": 1,
            "message": {
                "message_id": 1,
                "date": TS,
                "chat": {"type": "group"},
                "text": "t",
            },
        },
        {"update_id": 1, "message": {"date": TS, "chat": {"id": 1, "type": "group", "title": "g"}}},
    ],
)
def test_unusable_updates_are_skipped(update):
    assert update_to_message(update) is None


def test_fetch_pages_with_offset_and_filters_window():
    old = post(3, 3, "$DEMO old")
    old["message"]["date"] = TS - 10 * 86400
    transport = FakeTransport([[post(10, 1, "a"), post(11, 2, "b")], [old, post(12, 4, "c")]])
    messages = list(BotApiSource("TOKEN-VALUE", transport).fetch(*WINDOW))
    assert [m.message_id for m in messages] == ["1", "2", "4"]
    assert [c[2].get("offset") for c in transport.calls] == [None, 12, 13]
    assert all(c[1] == "getUpdates" for c in transport.calls)


def test_api_error_does_not_leak_token():
    def refuse(token, method, payload):
        return {"ok": False, "error_code": 401, "description": f"bad {token}"}

    with pytest.raises(SourceError) as err:
        list(BotApiSource("SECRET-TOKEN-123", refuse).fetch(*WINDOW))
    assert "SECRET-TOKEN-123" not in str(err.value)
    assert "401" in str(err.value)


def test_http_transport_errors_do_not_leak_token(monkeypatch):
    import urllib.error
    import urllib.request

    def boom(request, timeout):
        raise urllib.error.URLError("nope " + request.full_url)

    monkeypatch.setattr(urllib.request, "urlopen", boom)
    with pytest.raises(SourceError) as err:
        http_transport("SECRET-TOKEN-123", "getUpdates", {})
    assert "SECRET-TOKEN-123" not in str(err.value)


def test_empty_token_rejected():
    with pytest.raises(SourceError):
        BotApiSource("")


def test_cli_bot_source_requires_env_var(capsys, monkeypatch):
    monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
    args = [
        "--token",
        "DEMO",
        "--source",
        "bot",
        "--as-of",
        "2026-10-10T12:00:00Z",
        "--registry",
        str(ROOT / "fixtures" / "registry.json"),
        "--policy",
        str(ROOT / "data" / "policy.json"),
        "--token-config",
        str(ROOT / "data" / "tokens" / "demo.json"),
    ]
    assert main(args) == 2
    assert "TELEGRAM_BOT_TOKEN is not set" in capsys.readouterr().err


def test_cli_bot_source_with_fake_transport_and_capture(tmp_path, monkeypatch, capsys):
    import arc_collector.cli as cli

    transport = FakeTransport([[post(1, 1, f"$DEMO {DEMO_CA} listing"), post(2, 2, "hello")]])
    real = cli.BotApiSource
    monkeypatch.setattr(cli, "BotApiSource", lambda token: real(token, transport))
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", KEY)
    capture = tmp_path / "live" / "cap.json"
    args = [
        "--token",
        "DEMO",
        "--source",
        "bot",
        "--as-of",
        "2026-10-10T00:00:00Z",
        "--registry",
        str(ROOT / "fixtures" / "registry.json"),
        "--policy",
        str(ROOT / "data" / "policy.json"),
        "--token-config",
        str(ROOT / "data" / "tokens" / "demo.json"),
        "--capture",
        str(capture),
    ]
    assert main(args) == 0
    out = json.loads(capsys.readouterr().out)
    assert out["totals"]["mentions_confirmed"] == 1
    assert out["by_channel"][0]["channel"].startswith("unregistered-")
    saved = json.loads(capture.read_text())
    assert len(saved["records"]) == 1  # the message that does not mention the token is not stored
    assert "text" not in capture.read_text().replace(
        '"description": "metadata only, no message text"', ""
    )
    assert "listing" not in capture.read_text()  # words from the message text are never stored
    record = saved["records"][0]
    assert record["kind"] == "confirmed"
    assert record["contract_addresses"] == [DEMO_CA]


def test_group_title_cannot_impersonate_a_registered_channel(run, registry):
    """A group titled like a registered channel gets no tier (live-path impersonation)."""
    chat = {"id": -777, "type": "group", "title": "Fixture Tier1 News"}
    message = update_to_message(post(1, 1, f"$DEMO {DEMO_CA}", chat))
    assert message.channel == "chat-777"
    summary = run([message])
    (row,) = summary["by_channel"]
    assert (row["registered"], row["tier"]) == (False, "unrated")
    assert row["channel"].startswith("unregistered-")


def test_forward_origin_title_is_not_trusted_either():
    origin = {
        "type": "channel",
        "chat": {"id": -9, "type": "channel", "title": "Fixture Tier1 News"},
        "message_id": 5,
    }
    m = update_to_message(post(1, 1, "x", forward_origin=origin))
    assert m.forwarded_from.channel == "chat-9"


def test_capture_matches_the_summary_rules(tmp_path, monkeypatch, capsys):
    import arc_collector.cli as cli

    excluded_chat = {"id": -5, "type": "channel", "username": "fixture_excluded_feed"}
    duplicate = post(3, 1, f"$DEMO {DEMO_CA} again")  # same chat + message id as the first
    transport = FakeTransport(
        [
            [
                post(1, 1, f"$DEMO {DEMO_CA} first"),
                post(2, 9, "$DEMO from an excluded feed", excluded_chat),
                duplicate,
            ]
        ]
    )
    real = cli.BotApiSource
    monkeypatch.setattr(cli, "BotApiSource", lambda token: real(token, transport))
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", KEY)
    capture = tmp_path / "cap.json"
    args = [
        "--token",
        "DEMO",
        "--source",
        "bot",
        "--as-of",
        "2026-10-10T00:00:00Z",
        "--registry",
        str(ROOT / "fixtures" / "registry.json"),
        "--policy",
        str(ROOT / "data" / "policy.json"),
        "--token-config",
        str(ROOT / "data" / "tokens" / "demo.json"),
        "--capture",
        str(capture),
    ]
    assert main(args) == 0
    summary = json.loads(capsys.readouterr().out)
    records = json.loads(capture.read_text())["records"]
    assert (
        len(records) == summary["totals"]["mentions_total"] == 1
    )  # excluded + duplicate not stored


def test_live_run_saves_metadata_by_default(tmp_path, monkeypatch, capsys):
    import arc_collector.cli as cli

    monkeypatch.chdir(tmp_path)
    transport = FakeTransport([[post(1, 1, f"$DEMO {DEMO_CA} hello")]])
    real = cli.BotApiSource
    monkeypatch.setattr(cli, "BotApiSource", lambda token: real(token, transport))
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", KEY)
    args = [
        "--token",
        "DEMO",
        "--source",
        "bot",
        "--as-of",
        "now",
        "--registry",
        str(ROOT / "fixtures" / "registry.json"),
        "--policy",
        str(ROOT / "data" / "policy.json"),
        "--token-config",
        str(ROOT / "data" / "tokens" / "demo.json"),
    ]
    # the fake message is dated 2026-10-09; widen the window so "now" still covers it
    assert main([*args, "--window-hours", "8760"]) == 0
    saved = tmp_path / "fixtures" / "live" / "last_run.json"
    records = json.loads(saved.read_text())["records"]
    assert len(records) == 1 and "hello" not in saved.read_text()


KEY = "123456789:AAH" + "x" * 32  # shaped like a bot key, not a real one


def test_clean_bot_token_accepts_what_people_really_paste():
    for pasted in (
        KEY,
        f" {KEY}\r\n",
        f"Token: {KEY}",
        f'"{KEY}"',
        f"HTTP API:\n{KEY}\n",
        KEY[:20] + " " + KEY[20:],  # a stray space inside the key
        KEY[:15] + "\r\n" + KEY[15:],  # the key wrapped onto a second line
    ):
        assert clean_bot_token(pasted) == KEY


def test_clean_bot_token_rejects_bad_values_without_echoing_them():
    from arc_collector.botsource import clean_bot_token as clean

    for bad in (
        "",
        "   ",
        "not a key",
        f"{KEY} {KEY[:-1]}y",
        "123456789:short",
        "Bot name: CodenameARRCC",
    ):
        with pytest.raises(SourceError) as err:
            clean(bad)
        message = str(err.value)
        assert "does not look right" in message
        assert KEY[10:30] not in message and (bad.strip() not in message or not bad.strip())


def test_http_transport_hides_the_key_even_for_invalid_urls():
    """Regression: a key containing a space made http.client raise InvalidURL quoting the URL."""
    leaky = "123456789:AAH bad key with spaces " + "y" * 20
    with pytest.raises(SourceError) as err:
        http_transport(leaky, "getUpdates", {})
    assert "bad key" not in str(err.value)
    assert "AAH" not in str(err.value)
    assert err.value.__cause__ is None and err.value.__suppress_context__


def test_cli_cleans_a_pasted_label_before_using_the_key(tmp_path, monkeypatch, capsys):
    import arc_collector.cli as cli

    seen = []
    transport = FakeTransport([[post(1, 1, f"$DEMO {DEMO_CA} hi")]])

    def build(token):
        seen.append(token)
        return BotApiSource(token, transport)

    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(cli, "BotApiSource", build)
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", f"Token: {KEY}\n")
    args = [
        "--token",
        "DEMO",
        "--source",
        "bot",
        "--as-of",
        "now",
        "--window-hours",
        "8760",
        "--registry",
        str(ROOT / "fixtures" / "registry.json"),
        "--policy",
        str(ROOT / "data" / "policy.json"),
        "--token-config",
        str(ROOT / "data" / "tokens" / "demo.json"),
    ]
    assert main(args) == 0
    assert seen == [KEY]


def test_cli_reports_a_malformed_key_cleanly(monkeypatch, capsys):
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "Bot name: CodenameARRCC")
    args = [
        "--token",
        "DEMO",
        "--source",
        "bot",
        "--as-of",
        "now",
        "--registry",
        str(ROOT / "fixtures" / "registry.json"),
        "--policy",
        str(ROOT / "data" / "policy.json"),
        "--token-config",
        str(ROOT / "data" / "tokens" / "demo.json"),
    ]
    assert main(args) == 2
    err = capsys.readouterr().err
    assert "does not look right" in err and "shape with letters and digits hidden" in err
    assert "CodenameARRCC" not in err


def test_error_shape_hides_every_letter_and_digit():
    from arc_collector.botsource import mask_shape

    assert mask_shape("12ab: x\r\ny") == "99aa:<SP>a<CR><LF>a"
    with pytest.raises(SourceError) as err:
        clean_bot_token("My bot 123456: secretvalue")
    message = str(err.value)
    assert "secretvalue" not in message and "123456" not in message
    assert "aa<SP>aaa<SP>999999:<SP>aaaaaaaaaaa" in message
