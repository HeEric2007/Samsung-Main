# Prompt

Paste everything below the line into Claude Code (or another coding assistant) opened in
this repo's folder. Fill in the two blanks first.

---

I want to set up tizen-vibehack on my Samsung TV. This repo contains a launcher app
(`launcher/`), install script (`tools/build-and-install.sh`), remote tool (`tools/tv.py`),
Pi-hole blocklists (`blocklist/`) and a settings checklist (`docs/SETTINGS.md`). Read
README.md first.

- TV model: ______ (e.g. UN55NU6900)
- TV IP address: ______ (TV: Settings → General → Network → Network Status → IP Settings)

Work through this with me one step at a time. Before each step, tell me what you're about
to do and what I need to do on the TV. After each step, verify it worked before moving on.
Never do anything that roots, exploits or modifies the TV's firmware.

1. **Check the TV.** Set up `tools/venv`, install requirements, and run `tools/tv.py probe`.
   Tell me to accept the Allow prompt on the TV. Report the model, firmware and whether
   Developer Mode is on.
2. **Developer Mode.** If it's off, or its developer IP isn't this computer's IP, walk me
   through docs/SETTINGS.md → Developer Mode, giving me this computer's LAN IP. Re-probe
   to confirm.
3. **Tizen Studio.** Check for `~/tizen-studio/tools/ide/bin/tizen` and `~/tizen-studio/tools/sdb`
   (or ask where I installed it). If missing, give me the download link and the exact
   extensions to install from the README. Then `sdb connect <TV_IP>:26101` and confirm the
   TV appears in `sdb devices`.
4. **Certificate.** Check `tizen security-profiles list` for a `vibehack` profile. If it's
   missing, walk me through creating a Samsung TV certificate in Certificate Manager with
   the TV connected (README → One-time setup, step 4).
5. **Configure the launcher.** Run `tools/tv.py apps` and show me the list. Ask which apps I
   use, which 4 go in the dock (in order), and whether I use TizenTube. Edit
   `launcher/js/config.js` with my answers. Ask if I have PNG images for
   `launcher/img/mascots/` (optional).
6. **Install.** Run `TV_HOST=<ip> tools/build-and-install.sh`. If it fails, read the error and
   use the README's Gotchas section. Ask me to confirm VibeHome is on screen and that the
   dock, D-pad navigation and the all-apps grid work.
7. **Settings.** Walk me through the rest of docs/SETTINGS.md (tracking off, Autorun Last
   App on, pin VibeHome first).
8. **Optional extras.** Offer TizenBrew/TizenTube for ad-free YouTube, the Pi-hole blocklist
   (ask whether I have Pi-hole or AdGuard Home), and `tools/tv.py watch` on an always-on
   machine.

At the end, give me a short summary of what's installed and how to undo each part.
