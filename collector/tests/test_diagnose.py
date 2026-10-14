import pytest

from arc_collector.diagnose import describe, main
from arc_collector.sources import SourceError

KEY = "123456789:AAH" + "x" * 32


def fake(me, hook=None):
    calls = []

    def transport(token, method, payload):
        calls.append(method)
        if method == "getMe":
            return me
        return hook or {"ok": True, "result": {"url": ""}}

    transport.calls = calls
    return transport


GOOD_BOT = {
    "ok": True,
    "result": {
        "id": 42,
        "username": "TestBot",
        "can_join_groups": True,
        "can_read_all_group_messages": True,
    },
}


def test_healthy_bot():
    text = "\n".join(describe(fake(GOOD_BOT), KEY))
    assert "@TestBot" in text and "privacy mode off): yes" in text and "Webhook set: no" in text
    assert "Fix:" not in text


def test_privacy_mode_on_explains_the_fix():
    bot = {"ok": True, "result": {**GOOD_BOT["result"], "can_read_all_group_messages": False}}
    text = "\n".join(describe(fake(bot), KEY))
    assert "NO - privacy mode is ON" in text and "/setprivacy" in text


def test_webhook_is_flagged():
    hook = {"ok": True, "result": {"url": "https://example.com/hook"}}
    text = "\n".join(describe(fake(GOOD_BOT, hook), KEY))
    assert "YES" in text and "example.com" not in text


def test_refused_key_is_a_clean_error():
    with pytest.raises(SourceError, match="401"):
        describe(fake({"ok": False, "error_code": 401}), KEY)


def test_never_reads_messages_or_prints_the_key(monkeypatch, capsys):
    transport = fake(GOOD_BOT)
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", f"Token: {KEY}")
    assert main(transport) == 0
    out = capsys.readouterr()
    assert KEY not in out.out + out.err
    assert "getUpdates" not in transport.calls


def test_missing_key(monkeypatch, capsys):
    monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
    assert main(fake(GOOD_BOT)) == 2
    assert "not set" in capsys.readouterr().err
