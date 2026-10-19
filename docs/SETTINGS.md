# TV settings checklist (2018 Samsung, e.g. UN55NU6900)

Menu names below are from 2018 (Tizen 4.0) firmware. They shift slightly between
firmware versions; if one isn't exactly where listed, search nearby.

## Turn off ads and viewing-data collection

Settings → Support → Terms & Policy:

- **Viewing Information Services** → off (this is ACR, the screen-content tracking)
- **Interest-Based Advertisement** → off
- **Voice Recognition Services** → off, if you don't use voice

## Make VibeHome the thing you see

Settings → General → Smart Features:

- **Autorun Smart Hub** → off (stops the ad-filled Samsung home popping up at power-on)
- **Autorun Last App** → on (if VibeHome was the last app, it reopens at power-on)

Then in the Smart Hub app row: highlight VibeHome → press Down (or hold Enter) → **Move**
→ put it first.

For guaranteed open-on-power-on, run `tools/tv.py watch` on any always-on computer
(Raspberry Pi, the Pi-hole box, a NAS).

## Developer Mode (needed only to install/update VibeHome)

1. Open **Apps** from the Smart Hub row.
2. On the remote, press **1 2 3 4 5** (number pad, or the on-screen keypad on a
   One Remote).
3. Set Developer Mode **On**, and **Host PC IP** to your computer's IP address.
4. Restart the TV fully: hold the power button until the Samsung logo appears.

If your computer's IP changes later, repeat step 3 with the new address.
