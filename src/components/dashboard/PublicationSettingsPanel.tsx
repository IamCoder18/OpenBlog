"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Save, Sparkles } from "lucide-react";
import { useToast } from "@/components/ToastContext";
import {
  DEFAULT_PUBLICATION_SETTINGS,
  type PublicationSettings,
} from "@/lib/publication-settings.shared";

const cloneDefaults = () =>
  JSON.parse(
    JSON.stringify(DEFAULT_PUBLICATION_SETTINGS)
  ) as PublicationSettings;

const presets = [
  {
    name: "Indigo",
    colors: ["#5b50e6", "#177c6b", "#f7f8fc", "#ffffff", "#171a2b"],
  },
  {
    name: "Ocean",
    colors: ["#176fa8", "#087f73", "#f4f9fc", "#ffffff", "#15212a"],
  },
  {
    name: "Forest",
    colors: ["#197452", "#a14c16", "#f6f8f3", "#ffffff", "#182119"],
  },
  {
    name: "Ember",
    colors: ["#b74435", "#8155a6", "#fbf7f4", "#ffffff", "#281b19"],
  },
] as const;

const pageKeys = ["about", "contact", "privacy", "terms"] as const;

export default function PublicationSettingsPanel() {
  const toast = useToast();
  const [settings, setSettings] = useState<PublicationSettings>(cloneDefaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/publication")
      .then(async response => {
        if (!response.ok) throw new Error();
        setSettings(await response.json());
      })
      .catch(() =>
        toast.addToast("error", "Publication settings couldn’t be loaded.")
      )
      .finally(() => setLoading(false));
  }, [toast]);

  function updateAppearance<K extends keyof PublicationSettings["appearance"]>(
    key: K,
    value: PublicationSettings["appearance"][K]
  ) {
    setSettings(current => ({
      ...current,
      appearance: { ...current.appearance, [key]: value },
    }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/settings/publication", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(data?.error || "Publication settings failed");
      setSettings(data);
      toast.addToast("success", "Publication design saved.");
      window.location.reload();
    } catch (cause) {
      toast.addToast("error", (cause as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <section className="settings-panel" aria-busy="true">
        <p role="status">Loading publication controls…</p>
      </section>
    );

  const appearance = settings.appearance;
  return (
    <form onSubmit={save} className="space-y-6">
      <section className="settings-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="eyebrow">Publication design</span>
            <h2 className="mt-2 text-2xl font-bold">Visual system</h2>
            <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
              Shape the reader-facing publication with safe, responsive design
              controls. Contrast is validated before changes are saved.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setSettings(cloneDefaults())}
          >
            <RotateCcw className="size-4" /> Reset defaults
          </button>
        </div>

        <fieldset className="mt-7">
          <legend className="text-sm font-bold">Starting palette</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {presets.map(preset => (
              <button
                key={preset.name}
                type="button"
                className="rounded-xl border border-outline-variant bg-surface-container-lowest p-3 text-left transition-transform hover:-translate-y-0.5"
                onClick={() => {
                  const [primary, accent, background, surface, text] =
                    preset.colors;
                  setSettings(current => ({
                    ...current,
                    appearance: {
                      ...current.appearance,
                      primaryColor: primary,
                      accentColor: accent,
                      backgroundColor: background,
                      surfaceColor: surface,
                      textColor: text,
                    },
                  }));
                }}
              >
                <span className="flex gap-1.5" aria-hidden="true">
                  {preset.colors.slice(0, 4).map(color => (
                    <span
                      key={color}
                      className="size-6 rounded-full border border-black/10"
                      style={{ background: color }}
                    />
                  ))}
                </span>
                <strong className="mt-3 block text-sm">{preset.name}</strong>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-7 grid gap-7 xl:grid-cols-[1fr_0.8fr]">
          <div className="space-y-6">
            <ColorGroup
              title="Light colors"
              fields={[
                ["primaryColor", "Primary"],
                ["accentColor", "Accent"],
                ["backgroundColor", "Background"],
                ["surfaceColor", "Cards and surfaces"],
                ["textColor", "Text"],
              ]}
              appearance={appearance}
              update={updateAppearance}
            />
            <ColorGroup
              title="Dark colors"
              fields={[
                ["darkPrimaryColor", "Primary"],
                ["darkBackgroundColor", "Background"],
                ["darkSurfaceColor", "Cards and surfaces"],
                ["darkTextColor", "Text"],
              ]}
              appearance={appearance}
              update={updateAppearance}
            />
          </div>
          <div
            className="min-h-72 rounded-[var(--radius-card)] border p-5 shadow-xl transition-all"
            style={{
              background: appearance.backgroundColor,
              color: appearance.textColor,
              borderColor: `${appearance.textColor}2b`,
            }}
            aria-label="Live design preview"
          >
            <span
              className="inline-flex rounded-full px-2.5 py-1 text-xs font-bold text-white"
              style={{ background: appearance.primaryColor }}
            >
              Featured
            </span>
            <div
              className="mt-4 rounded-xl p-5"
              style={{ background: appearance.surfaceColor }}
            >
              <p className="text-xs opacity-70">Publication preview</p>
              <h3 className="mt-2 text-2xl font-bold">
                A story written by your authors
              </h3>
              <p className="mt-3 text-sm opacity-75">
                Colors, type, spacing, cards, and motion flow from the settings
                you choose here.
              </p>
              <span
                className="mt-5 inline-flex rounded-full px-4 py-2 text-sm font-bold text-white"
                style={{ background: appearance.primaryColor }}
              >
                Read story
              </span>
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            label="Typography"
            value={appearance.fontStyle}
            onChange={value =>
              updateAppearance(
                "fontStyle",
                value as PublicationSettings["appearance"]["fontStyle"]
              )
            }
            options={[
              ["modern", "Modern sans"],
              ["editorial", "Editorial contrast"],
              ["system", "System native"],
            ]}
          />
          <SelectField
            label="Corner style"
            value={appearance.radiusStyle}
            onChange={value =>
              updateAppearance(
                "radiusStyle",
                value as PublicationSettings["appearance"]["radiusStyle"]
              )
            }
            options={[
              ["rounded", "Rounded"],
              ["soft", "Soft"],
              ["sharp", "Sharp"],
            ]}
          />
          <SelectField
            label="Content density"
            value={appearance.density}
            onChange={value =>
              updateAppearance(
                "density",
                value as PublicationSettings["appearance"]["density"]
              )
            }
            options={[
              ["comfortable", "Comfortable"],
              ["compact", "Compact"],
            ]}
          />
          <SelectField
            label="Article layout"
            value={appearance.cardLayout}
            onChange={value =>
              updateAppearance(
                "cardLayout",
                value as PublicationSettings["appearance"]["cardLayout"]
              )
            }
            options={[
              ["grid", "Card grid"],
              ["list", "Reading list"],
            ]}
          />
          <SelectField
            label="Motion"
            value={appearance.motionStyle}
            onChange={value =>
              updateAppearance(
                "motionStyle",
                value as PublicationSettings["appearance"]["motionStyle"]
              )
            }
            options={[
              ["expressive", "Expressive"],
              ["subtle", "Subtle"],
            ]}
          />
          <Toggle
            label="Show cover images"
            checked={appearance.showCoverImages}
            onChange={checked => updateAppearance("showCoverImages", checked)}
          />
        </div>
      </section>

      <section className="settings-panel">
        <span className="eyebrow">Homepage and footer</span>
        <h2 className="mt-2 text-2xl font-bold">Public presentation</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Toggle
            label="Show publication description"
            checked={settings.homepage.showDescription}
            onChange={checked =>
              setSettings(current => ({
                ...current,
                homepage: { ...current.homepage, showDescription: checked },
              }))
            }
          />
          <Toggle
            label="Show topic shortcuts"
            checked={settings.homepage.showTopics}
            onChange={checked =>
              setSettings(current => ({
                ...current,
                homepage: { ...current.homepage, showTopics: checked },
              }))
            }
          />
          <Toggle
            label="Powered by OpenBlog"
            checked={settings.footer.poweredByOpenBlog}
            onChange={checked =>
              setSettings(current => ({
                ...current,
                footer: { ...current.footer, poweredByOpenBlog: checked },
              }))
            }
          />
        </div>
      </section>

      <section className="settings-panel">
        <span className="eyebrow">Publication pages</span>
        <h2 className="mt-2 text-2xl font-bold">Editable page templates</h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Enable only the pages this publication needs, then replace the starter
          copy with operator-approved content.
        </p>
        <div className="mt-5 space-y-3">
          {pageKeys.map(key => {
            const page = settings.pages[key];
            return (
              <details
                key={key}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 open:shadow-lg"
              >
                <summary className="cursor-pointer list-none font-bold">
                  <span className="flex items-center justify-between gap-4">
                    {page.title}
                    <span className="text-xs text-on-surface-variant">
                      {page.enabled ? "Published" : "Hidden"}
                    </span>
                  </span>
                </summary>
                <div className="mt-5 space-y-4">
                  <Toggle
                    label="Show this page publicly"
                    checked={page.enabled}
                    onChange={enabled =>
                      setSettings(current => ({
                        ...current,
                        pages: {
                          ...current.pages,
                          [key]: { ...current.pages[key], enabled },
                        },
                      }))
                    }
                  />
                  <label className="block text-sm font-semibold">
                    Page title
                    <input
                      className="input-field mt-2 w-full"
                      value={page.title}
                      maxLength={80}
                      onChange={event =>
                        setSettings(current => ({
                          ...current,
                          pages: {
                            ...current.pages,
                            [key]: {
                              ...current.pages[key],
                              title: event.target.value,
                            },
                          },
                        }))
                      }
                    />
                  </label>
                  <label className="block text-sm font-semibold">
                    Markdown content
                    <textarea
                      className="input-field mt-2 min-h-52 w-full font-mono text-sm"
                      value={page.bodyMarkdown}
                      onChange={event =>
                        setSettings(current => ({
                          ...current,
                          pages: {
                            ...current.pages,
                            [key]: {
                              ...current.pages[key],
                              bodyMarkdown: event.target.value,
                            },
                          },
                        }))
                      }
                    />
                  </label>
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <div className="sticky bottom-4 z-20 flex justify-end">
        <button className="btn-primary shadow-2xl" disabled={saving}>
          {saving ? (
            <Sparkles className="size-4 animate-pulse" />
          ) : (
            <Save className="size-4" />
          )}
          {saving ? "Applying design…" : "Save publication design"}
        </button>
      </div>
    </form>
  );
}

function ColorGroup({
  title,
  fields,
  appearance,
  update,
}: {
  title: string;
  fields: ReadonlyArray<
    readonly [keyof PublicationSettings["appearance"], string]
  >;
  appearance: PublicationSettings["appearance"];
  update: <K extends keyof PublicationSettings["appearance"]>(
    key: K,
    value: PublicationSettings["appearance"][K]
  ) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-bold">{title}</legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {fields.map(([key, label]) => (
          <label key={key} className="text-sm font-semibold">
            {label}
            <span className="mt-2 flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-2">
              <input
                type="color"
                value={appearance[key] as string}
                onChange={event => update(key, event.target.value as never)}
                className="size-10 cursor-pointer rounded-lg border-0 bg-transparent"
              />
              <span className="font-mono text-xs uppercase">
                {appearance[key] as string}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <select
        className="input-field mt-2 min-h-12 w-full"
        value={value}
        onChange={event => onChange(event.target.value)}
      >
        {options.map(([option, name]) => (
          <option key={option} value={option}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm font-semibold">
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        className="size-5 accent-primary"
      />
    </label>
  );
}
