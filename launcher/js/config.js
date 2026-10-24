/*
 * VibeHome configuration. Edit this file, then rerun tools/build-and-install.sh.
 *
 * Apps are matched by NAME (case-insensitive, "contains" match), because Samsung's
 * internal app ids differ between firmware versions. Run `tools/tv.py apps` to see
 * the exact names installed on your TV.
 */
window.VIBE_CONFIG = {
    // Look: "default" (clean, tvOS-style) or "pixel" (8-bit arcade).
    theme: "pixel",

    // Up to 7 apps for the dock, in order. Missing apps are skipped.
    // Using TizenTube for ad-free YouTube? Put "TizenBrew" here instead of "YouTube".
    dock: ["YouTube", "Netflix", "Disney+", "Hulu", "Paramount+", "Apple TV", "Spotify"],

    // Apps to hide from the "all apps" grid (substring match on name).
    hidden: [
        "e-Manual", "Samsung Promotion", "Samsung Health", "Universal Guide",
        "Gallery", "Web Browser", "SmartThings", "Art Store", "Bixby",
        "Samsung TV Plus", "Rakuten", "Facebook Watch", "VibeHome", "Tizen"
    ],

    // Strict mode: if this list has names, the all-apps screen shows ONLY the dock apps
    // plus these (if installed). Leave empty to show everything except `hidden`.
    onlyShow: ["Prime Video", "Max", "Peacock", "Pluto TV", "Tubi", "ESPN", "Sling"],

    // Samsung's internal system apps are hidden automatically. Set true to see them.
    showSystemApps: false,

    // Entries for the Inputs pill. type is one of: "TV", "HDMI", "AV", "COMP".
    inputs: [
        { label: "Live TV", type: "TV",   number: 1 },
        { label: "HDMI 1",  type: "HDMI", number: 1 },
        { label: "HDMI 2",  type: "HDMI", number: 2 },
        { label: "HDMI 3",  type: "HDMI", number: 3 },
        { label: "AV",      type: "AV",   number: 1 }
    ],

    // Little buddies that sit on the dock and hop when you switch apps.
    // Drop transparent images named 1.png / 1.gif and 2.png / 2.gif into
    // launcher/img/mascots/ (git-ignored, so your pictures stay on your machine and TV).
    // Animated GIFs work. If both 2.gif and 2.png exist, the GIF wins.
    mascots: ["img/mascots/1", "img/mascots/2"],

    columns: 6,          // tiles per row in the all-apps grid
    use24h: false,       // clock format
    name: ""             // optional: "Good evening, Sam"
};
