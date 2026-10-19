#!/usr/bin/env python3
"""
Talk to a Samsung Tizen TV over its local remote-control API (no Developer Mode needed).

    export TV_HOST=192.168.1.50
    python3 tools/tv.py probe            # model, firmware, power state
    python3 tools/tv.py apps             # installed apps (names + ids) for launcher/js/config.js
    python3 tools/tv.py launch <appId>   # open an app by id
    python3 tools/tv.py key KEY_HOME     # press a remote key (KEY_SOURCE, KEY_VOLUP, ...)
    python3 tools/tv.py home             # open VibeHome
    python3 tools/tv.py watch            # keep running; open VibeHome every time the TV turns on

The first command shows an "Allow" prompt on the TV. Accept it once; the token is saved
to tools/.tv-token so later commands connect silently.
"""
import argparse
import os
import socket
import sys
import time

try:
    from samsungtvws import SamsungTVWS
except ImportError:
    sys.exit("Missing dependency. Run: pip install -r tools/requirements.txt")

HERE = os.path.dirname(os.path.abspath(__file__))
TOKEN_FILE = os.path.join(HERE, ".tv-token")
VIBEHOME_ID = "VbHackTV01.VibeHome"


def tv(host):
    return SamsungTVWS(host=host, port=8002, token_file=TOKEN_FILE, name="VibeHack", timeout=8)


def reachable(host, port=8001, timeout=2.0):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def cmd_probe(host, _args):
    info = tv(host).rest_device_info()
    d = info.get("device", {})
    for key in ("name", "modelName", "model", "firmwareVersion", "OS", "PowerState", "wifiMac", "networkType"):
        if key in d:
            print("%-16s %s" % (key, d[key]))
    print("%-16s %s" % ("developerMode", d.get("developerMode", "?")))
    print("%-16s %s" % ("developerIP", d.get("developerIP", "?")))


def cmd_apps(host, _args):
    apps = tv(host).app_list() or []
    if not apps:
        print("The TV returned no app list (some firmware versions don't support it).")
        return
    for a in sorted(apps, key=lambda x: str(x.get("name", "")).lower()):
        print("%-34s %s" % (a.get("name", "?"), a.get("appId", "?")))
    print("\nPut names (not ids) in launcher/js/config.js -> dock / hidden.")


def cmd_launch(host, args):
    tv(host).run_app(args.app_id, app_type=args.type)
    print("Sent launch for", args.app_id)


def cmd_key(host, args):
    tv(host).send_key(args.key)
    print("Sent", args.key)


def cmd_home(host, args):
    tv(host).run_app(VIBEHOME_ID, app_type=args.type)
    print("Opened VibeHome")


def cmd_watch(host, args):
    print("Watching %s. VibeHome opens %ss after the TV turns on. Ctrl+C to stop." % (host, args.delay))
    was_on = reachable(host)
    while True:
        on = reachable(host)
        if on and not was_on:
            time.sleep(args.delay)
            try:
                tv(host).run_app(VIBEHOME_ID, app_type=args.type)
                print(time.strftime("%H:%M:%S"), "TV on -> opened VibeHome")
            except Exception as e:  # TV still booting, or token prompt pending
                print(time.strftime("%H:%M:%S"), "TV on, but launch failed:", e)
        was_on = on
        time.sleep(args.interval)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--host", default=os.environ.get("TV_HOST"), help="TV IP (or set TV_HOST)")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("probe")
    sub.add_parser("apps")
    s = sub.add_parser("launch"); s.add_argument("app_id"); s.add_argument("--type", default="DEEP_LINK")
    s = sub.add_parser("key"); s.add_argument("key")
    s = sub.add_parser("home"); s.add_argument("--type", default="DEEP_LINK")
    s = sub.add_parser("watch")
    s.add_argument("--delay", type=int, default=10, help="seconds to wait after power-on")
    s.add_argument("--interval", type=int, default=5, help="seconds between checks")
    s.add_argument("--type", default="DEEP_LINK")
    args = p.parse_args()
    if not args.host:
        p.error("set TV_HOST or pass --host")
    {"probe": cmd_probe, "apps": cmd_apps, "launch": cmd_launch, "key": cmd_key,
     "home": cmd_home, "watch": cmd_watch}[args.cmd](args.host, args)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
