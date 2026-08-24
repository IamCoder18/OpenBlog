import {
  DEFAULT_PUBLICATION_SETTINGS,
  contrastRatio,
  normalizePublicationSettings,
  publicationCss,
  publicationSettingsErrors,
} from "@/lib/publication-settings.shared";

describe("publication settings", () => {
  it("normalizes partial settings without losing safe defaults", () => {
    const settings = normalizePublicationSettings({
      appearance: { primaryColor: "#123456", motionStyle: "subtle" },
      footer: { poweredByOpenBlog: false },
    });
    expect(settings.appearance.primaryColor).toBe("#123456");
    expect(settings.appearance.motionStyle).toBe("subtle");
    expect(settings.appearance.textColor).toBe(
      DEFAULT_PUBLICATION_SETTINGS.appearance.textColor
    );
    expect(settings.footer.poweredByOpenBlog).toBe(false);
    expect(settings.pages.privacy.enabled).toBe(true);
  });

  it("rejects invalid color and enum values by restoring defaults", () => {
    const settings = normalizePublicationSettings({
      appearance: {
        primaryColor: "red;display:none",
        fontStyle: "comic",
      },
    });
    expect(settings.appearance.primaryColor).toBe(
      DEFAULT_PUBLICATION_SETTINGS.appearance.primaryColor
    );
    expect(settings.appearance.fontStyle).toBe("modern");
  });

  it("detects unreadable light and dark palettes", () => {
    const settings = normalizePublicationSettings({
      appearance: {
        backgroundColor: "#ffffff",
        surfaceColor: "#ffffff",
        textColor: "#eeeeee",
        darkBackgroundColor: "#000000",
        darkSurfaceColor: "#000000",
        darkTextColor: "#111111",
      },
    });
    expect(publicationSettingsErrors(settings)).toHaveLength(4);
    expect(contrastRatio("#000000", "#ffffff")).toBeGreaterThan(20);
  });

  it("emits only normalized design values into publication CSS", () => {
    const settings = normalizePublicationSettings({
      appearance: { primaryColor: "#123456" },
    });
    const css = publicationCss(settings);
    expect(css).toContain("--color-primary:#123456");
    expect(css).not.toContain("<script");
  });
});
