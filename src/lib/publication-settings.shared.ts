export type FontStyle = "modern" | "editorial" | "system";
export type RadiusStyle = "soft" | "rounded" | "sharp";
export type ContentDensity = "comfortable" | "compact";
export type CardLayout = "grid" | "list";
export type MotionStyle = "subtle" | "expressive";

export interface EditablePageSettings {
  enabled: boolean;
  title: string;
  bodyMarkdown: string;
}

export interface PublicationSettings {
  appearance: {
    primaryColor: string;
    accentColor: string;
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    darkPrimaryColor: string;
    darkBackgroundColor: string;
    darkSurfaceColor: string;
    darkTextColor: string;
    fontStyle: FontStyle;
    radiusStyle: RadiusStyle;
    density: ContentDensity;
    cardLayout: CardLayout;
    showCoverImages: boolean;
    motionStyle: MotionStyle;
  };
  homepage: {
    showDescription: boolean;
    showTopics: boolean;
  };
  footer: {
    poweredByOpenBlog: boolean;
  };
  pages: {
    about: EditablePageSettings;
    contact: EditablePageSettings;
    privacy: EditablePageSettings;
    terms: EditablePageSettings;
  };
}

export const DEFAULT_PUBLICATION_SETTINGS: PublicationSettings = {
  appearance: {
    primaryColor: "#5b50e6",
    accentColor: "#177c6b",
    backgroundColor: "#f7f8fc",
    surfaceColor: "#ffffff",
    textColor: "#171a2b",
    darkPrimaryColor: "#a9a1ff",
    darkBackgroundColor: "#11131b",
    darkSurfaceColor: "#191c27",
    darkTextColor: "#f2f3f8",
    fontStyle: "modern",
    radiusStyle: "rounded",
    density: "comfortable",
    cardLayout: "grid",
    showCoverImages: true,
    motionStyle: "expressive",
  },
  homepage: { showDescription: true, showTopics: true },
  footer: { poweredByOpenBlog: true },
  pages: {
    about: {
      enabled: false,
      title: "About",
      bodyMarkdown:
        "Tell readers about this publication, its authors, and what they can expect to find here.",
    },
    contact: {
      enabled: false,
      title: "Contact",
      bodyMarkdown:
        "Explain how readers can contact the publication about questions, corrections, or other inquiries.",
    },
    privacy: {
      enabled: true,
      title: "Privacy",
      bodyMarkdown:
        "This publication stores account information supplied by registered users and limited article-view information needed to operate the site. Contact the site operator to request access, correction, or deletion of your information.\n\nUpdate this template to describe your deployment, retention practices, service providers, and applicable legal requirements.",
    },
    terms: {
      enabled: true,
      title: "Terms",
      bodyMarkdown:
        "Use this publication lawfully and only access content or accounts you are authorized to use. Authors remain responsible for the content they submit.\n\nUpdate this template with the terms that apply to your publication and jurisdiction.",
    },
  },
};

const hexPattern = /^#[0-9a-f]{6}$/i;
const choices = {
  fontStyle: ["modern", "editorial", "system"],
  radiusStyle: ["soft", "rounded", "sharp"],
  density: ["comfortable", "compact"],
  cardLayout: ["grid", "list"],
  motionStyle: ["subtle", "expressive"],
} as const;

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function text(value: unknown, fallback: string, maximum: number): string {
  return typeof value === "string" ? value.trim().slice(0, maximum) : fallback;
}

function color(value: unknown, fallback: string): string {
  return typeof value === "string" && hexPattern.test(value)
    ? value.toLowerCase()
    : fallback;
}

function choice<T extends string>(
  value: unknown,
  values: readonly T[],
  fallback: T
): T {
  return typeof value === "string" && values.includes(value as T)
    ? (value as T)
    : fallback;
}

function page(
  value: unknown,
  fallback: EditablePageSettings
): EditablePageSettings {
  const source = object(value);
  return {
    enabled: bool(source.enabled, fallback.enabled),
    title: text(source.title, fallback.title, 80) || fallback.title,
    bodyMarkdown: text(source.bodyMarkdown, fallback.bodyMarkdown, 30_000),
  };
}

export function normalizePublicationSettings(
  value: unknown
): PublicationSettings {
  const source = object(value);
  const appearance = object(source.appearance);
  const homepage = object(source.homepage);
  const footer = object(source.footer);
  const pages = object(source.pages);
  const defaults = DEFAULT_PUBLICATION_SETTINGS;
  return {
    appearance: {
      primaryColor: color(
        appearance.primaryColor,
        defaults.appearance.primaryColor
      ),
      accentColor: color(
        appearance.accentColor,
        defaults.appearance.accentColor
      ),
      backgroundColor: color(
        appearance.backgroundColor,
        defaults.appearance.backgroundColor
      ),
      surfaceColor: color(
        appearance.surfaceColor,
        defaults.appearance.surfaceColor
      ),
      textColor: color(appearance.textColor, defaults.appearance.textColor),
      darkPrimaryColor: color(
        appearance.darkPrimaryColor,
        defaults.appearance.darkPrimaryColor
      ),
      darkBackgroundColor: color(
        appearance.darkBackgroundColor,
        defaults.appearance.darkBackgroundColor
      ),
      darkSurfaceColor: color(
        appearance.darkSurfaceColor,
        defaults.appearance.darkSurfaceColor
      ),
      darkTextColor: color(
        appearance.darkTextColor,
        defaults.appearance.darkTextColor
      ),
      fontStyle: choice(
        appearance.fontStyle,
        choices.fontStyle,
        defaults.appearance.fontStyle
      ),
      radiusStyle: choice(
        appearance.radiusStyle,
        choices.radiusStyle,
        defaults.appearance.radiusStyle
      ),
      density: choice(
        appearance.density,
        choices.density,
        defaults.appearance.density
      ),
      cardLayout: choice(
        appearance.cardLayout,
        choices.cardLayout,
        defaults.appearance.cardLayout
      ),
      showCoverImages: bool(
        appearance.showCoverImages,
        defaults.appearance.showCoverImages
      ),
      motionStyle: choice(
        appearance.motionStyle,
        choices.motionStyle,
        defaults.appearance.motionStyle
      ),
    },
    homepage: {
      showDescription: bool(
        homepage.showDescription,
        defaults.homepage.showDescription
      ),
      showTopics: bool(homepage.showTopics, defaults.homepage.showTopics),
    },
    footer: {
      poweredByOpenBlog: bool(
        footer.poweredByOpenBlog,
        defaults.footer.poweredByOpenBlog
      ),
    },
    pages: {
      about: page(pages.about, defaults.pages.about),
      contact: page(pages.contact, defaults.pages.contact),
      privacy: page(pages.privacy, defaults.pages.privacy),
      terms: page(pages.terms, defaults.pages.terms),
    },
  };
}

function rgb(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function luminance(hex: string): number {
  const values = rgb(hex).map(channel => {
    const value = channel / 255;
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}

export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a
  );
  return (lighter + 0.05) / (darker + 0.05);
}

export function publicationSettingsErrors(
  settings: PublicationSettings
): string[] {
  const { appearance } = settings;
  const errors: string[] = [];
  if (contrastRatio(appearance.textColor, appearance.backgroundColor) < 4.5)
    errors.push(
      "Light text and background colors need at least 4.5:1 contrast."
    );
  if (contrastRatio(appearance.textColor, appearance.surfaceColor) < 4.5)
    errors.push("Light text and surface colors need at least 4.5:1 contrast.");
  if (
    contrastRatio(appearance.darkTextColor, appearance.darkBackgroundColor) <
    4.5
  )
    errors.push(
      "Dark text and background colors need at least 4.5:1 contrast."
    );
  if (
    contrastRatio(appearance.darkTextColor, appearance.darkSurfaceColor) < 4.5
  )
    errors.push("Dark text and surface colors need at least 4.5:1 contrast.");
  return errors;
}

export function publicationCss(settings: PublicationSettings): string {
  const a = settings.appearance;
  const [red, green, blue] = rgb(a.primaryColor);
  const [darkRed, darkGreen, darkBlue] = rgb(a.darkPrimaryColor);
  const light = `
    --color-primary:${a.primaryColor};
    --color-primary-container:color-mix(in srgb, ${a.primaryColor} 82%, #000);
    --color-secondary:${a.accentColor};
    --color-background:${a.backgroundColor};
    --color-surface:${a.backgroundColor};
    --color-surface-container-lowest:${a.surfaceColor};
    --color-surface-container-low:color-mix(in srgb, ${a.surfaceColor} 88%, ${a.backgroundColor});
    --color-surface-container:color-mix(in srgb, ${a.surfaceColor} 70%, ${a.backgroundColor});
    --color-surface-container-high:color-mix(in srgb, ${a.textColor} 9%, ${a.surfaceColor});
    --color-surface-container-highest:color-mix(in srgb, ${a.textColor} 14%, ${a.surfaceColor});
    --color-on-surface:${a.textColor};
    --color-on-background:${a.textColor};
    --color-on-surface-variant:color-mix(in srgb, ${a.textColor} 72%, ${a.backgroundColor});
    --color-outline-variant:color-mix(in srgb, ${a.textColor} 18%, ${a.backgroundColor});
    --theme-gradient-start:${a.primaryColor};
    --theme-gradient-end:color-mix(in srgb, ${a.primaryColor} 78%, #000);
    --theme-shadow-rgb:${red},${green},${blue};
    --background:${a.backgroundColor};
    --foreground:${a.textColor};`;
  const dark = `
    --color-primary:${a.darkPrimaryColor};
    --color-primary-container:color-mix(in srgb, ${a.darkPrimaryColor} 68%, #000);
    --color-background:${a.darkBackgroundColor};
    --color-surface:${a.darkBackgroundColor};
    --color-surface-container-lowest:${a.darkSurfaceColor};
    --color-surface-container-low:color-mix(in srgb, ${a.darkSurfaceColor} 88%, ${a.darkBackgroundColor});
    --color-surface-container:color-mix(in srgb, ${a.darkTextColor} 10%, ${a.darkSurfaceColor});
    --color-surface-container-high:color-mix(in srgb, ${a.darkTextColor} 15%, ${a.darkSurfaceColor});
    --color-surface-container-highest:color-mix(in srgb, ${a.darkTextColor} 20%, ${a.darkSurfaceColor});
    --color-on-surface:${a.darkTextColor};
    --color-on-background:${a.darkTextColor};
    --color-on-surface-variant:color-mix(in srgb, ${a.darkTextColor} 72%, ${a.darkBackgroundColor});
    --color-outline-variant:color-mix(in srgb, ${a.darkTextColor} 20%, ${a.darkBackgroundColor});
    --theme-gradient-start:${a.darkPrimaryColor};
    --theme-gradient-end:color-mix(in srgb, ${a.darkPrimaryColor} 72%, #000);
    --theme-shadow-rgb:${darkRed},${darkGreen},${darkBlue};
    --background:${a.darkBackgroundColor};
    --foreground:${a.darkTextColor};`;
  return `
    html[data-theme][data-font]{${light}}
    html[data-theme][data-font][data-color-mode="dark"]{${dark}}
    @media (prefers-color-scheme:dark){html[data-theme][data-font][data-color-mode="system"]{${dark}}}
  `;
}
