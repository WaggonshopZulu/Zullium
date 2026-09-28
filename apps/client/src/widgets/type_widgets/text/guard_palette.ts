/** A swatch: the color, and the name shown when the pointer rests on it. */
interface Swatch {
    color: string;
    label: string;
}

/** OneNote's highlight range, in its order. Yellow is the highlight color the branding approved. */
export const HIGHLIGHT_COLORS: Swatch[] = [
    { color: "#fde047", label: "Yellow" },
    { color: "#00ff00", label: "Bright Green" },
    { color: "#00ffff", label: "Turquoise" },
    { color: "#ff00ff", label: "Pink" },
    { color: "#0000ff", label: "Blue" },
    { color: "#ff0000", label: "Red" },
    { color: "#000080", label: "Dark Blue" },
    { color: "#008080", label: "Teal" },
    { color: "#008000", label: "Green" },
    { color: "#800080", label: "Violet" },
    { color: "#800000", label: "Dark Red" },
    { color: "#808000", label: "Dark Yellow" },
    { color: "#808080", label: "Gray 50%" },
    { color: "#c0c0c0", label: "Gray 25%" },
    { color: "#000000", label: "Black" },
    { color: "#ffffff", label: "White" }
];

/** OneNote's standard font colors, in its order. */
export const FONT_COLORS: Swatch[] = [
    { color: "#c00000", label: "Dark Red" },
    { color: "#ff0000", label: "Red" },
    { color: "#ffc000", label: "Orange" },
    { color: "#ffff00", label: "Yellow" },
    { color: "#92d050", label: "Light Green" },
    { color: "#00b050", label: "Green" },
    { color: "#00b0f0", label: "Light Blue" },
    { color: "#0070c0", label: "Blue" },
    { color: "#002060", label: "Dark Blue" },
    { color: "#7030a0", label: "Purple" }
];

/** The typefaces offered, all present on a Windows workstation. */
export const FONT_FAMILIES = [
    "default",
    "Calibri, sans-serif",
    "Arial, Helvetica, sans-serif",
    "Segoe UI, sans-serif",
    "Verdana, Geneva, sans-serif",
    "Tahoma, sans-serif",
    "Georgia, serif",
    "Times New Roman, Times, serif",
    "Courier New, Courier, monospace"
];

/** Sizes in pixels, following the spread of OneNote's list. */
export const FONT_SIZES = [ 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72 ];

export const HIGHLIGHT_COLUMNS = 8;
export const FONT_COLOR_COLUMNS = 10;
