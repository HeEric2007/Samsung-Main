/*
 * VibeHome configuration. Edit this file, then rerun tools/build-and-install.sh.
 *
 * Apps are matched by NAME (case-insensitive, "contains" match), because Samsung's
 * internal app ids differ between firmware versions. Run `tools/tv.py apps` to see
 * the exact names installed on your TV.
 */
window.VIBE_CONFIG = {
    // Look: "default" (clean, tvOS-style) or "pixel" (8-bit arcade).
    theme: "default",

    // Up to 7 apps for the dock, in order. Missing apps are skipped.
    // Using TizenTube for ad-free YouTube? Put "TizenBrew" here instead of "YouTube".
    dock: ["Netflix", "YouTube", "Disney+", "Spotify"],

    // Apps to hide from the "all apps" grid (substring match on name).
    hidden: [
        "e-Manual", "Samsung Promotion", "Samsung Health", "Universal Guide",
        "Gallery", "Web Browser", "SmartThings", "Art Store", "Bixby",
        "Samsung TV Plus", "Rakuten", "Facebook Watch", "VibeHome"
    ],

    // Entries for the Inputs pill. type is one of: "TV", "HDMI", "AV", "COMP".
    inputs: [
        { label: "Live TV", type: "TV",   number: 1 },
        { label: "HDMI 1",  type: "HDMI", number: 1 },
        { label: "HDMI 2",  type: "HDMI", number: 2 },
        { label: "HDMI 3",  type: "HDMI", number: 3 },
        { label: "AV",      type: "AV",   number: 1 }
    ],

    // Little buddies that sit on the dock and hop when you switch apps.
    // Drop transparent PNGs into launcher/img/mascots/ (that folder is git-ignored,
    // so your pictures stay on your machine and TV). Missing files are skipped.
    mascots: ["img/mascots/1.png", "img/mascots/2.png"],

    columns: 6,          // tiles per row in the all-apps grid
    use24h: false,       // clock format
    name: ""             // optional: "Good evening, Sam"
};
