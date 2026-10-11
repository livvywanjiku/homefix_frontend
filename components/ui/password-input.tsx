"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { AdminInput } from "@/components/admin/ui";
import { Input } from "@/components/ui/field";

/**
 * Password fields with a show/hide control.
 *
 * Two of them, because the public forms and the console style their controls
 * from different token sets — `PasswordInput` wraps `Input`,
 * `AdminPasswordInput` wraps `AdminInput`. That is the only thing that differs.
 * Everything that must not drift between them is written once below: the glyph,
 * the size of the button's hit area, the `aria-*` wiring, and the fact that the
 * type flips at all.
 *
 * Neither takes a `type`. The point of the component is that the type changes
 * under the reader's hand, and a caller able to pin it could make the button a
 * lie about what it does.
 */

export function PasswordInput({
  className = "",
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <Shell>
      <Input
        {...props}
        type={visible ? "text" : "password"}
        // Clears the button. Tailwind orders `pr-*` after the control's `px-3`,
        // so this overrides the right edge only.
        className={`pr-11 ${className}`}
      />
      <Toggle visible={visible} onToggle={() => setVisible((current) => !current)} />
    </Shell>
  );
}

export function AdminPasswordInput({
  className = "",
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <Shell>
      <AdminInput
        {...props}
        type={visible ? "text" : "password"}
        // The console's control is shorter than the public one — it is set with
        // `py-2` rather than a fixed height — so it clears a narrower button.
        className={`pr-9 ${className}`}
      />
      <Toggle visible={visible} onToggle={() => setVisible((current) => !current)} admin />
    </Shell>
  );
}

/** The positioning context the toggle is anchored to. */
function Shell({ children }: { children: ReactNode }) {
  return <div className="relative">{children}</div>;
}

/**
 * The eye itself.
 *
 * A real `<button>`, not a styled span: it changes what is on screen, so it has
 * to be reachable by keyboard and has to say what it did. `aria-pressed` carries
 * the state; the label carries the action, describing what pressing it will do
 * next rather than what the field currently is.
 */
function Toggle({
  visible,
  onToggle,
  admin = false,
}: {
  visible: boolean;
  onToggle: () => void;
  admin?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={visible}
      aria-label={visible ? "Hide password" : "Show password"}
      className={`absolute inset-y-0 right-0 flex cursor-pointer items-center justify-center rounded-r-lg transition-colors focus-visible:ring-2 focus-visible:outline-none ${
        admin
          ? "w-9 text-admin-muted hover:text-admin-text focus-visible:ring-admin-accent/40"
          : "w-11 text-muted-foreground hover:text-foreground focus-visible:ring-brand/30"
      }`}
    >
      {visible ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );
}

/*
 * Drawn here rather than taken from `components/admin/icons.tsx`: these are used
 * on the sign-in pages, which a visitor reaches before they have an account and
 * which must not pull the console's icon module into their bundle.
 */

const GLYPH = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: "false",
} as const;

function EyeIcon() {
  return (
    <svg {...GLYPH}>
      <path d="M2.6 12S6.2 5.6 12 5.6 21.4 12 21.4 12 17.8 18.4 12 18.4 2.6 12 2.6 12Z" />
      <circle cx="12" cy="12" r="2.9" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg {...GLYPH}>
      <path d="M4 4l16 16" />
      <path d="M9.9 5.2a9.9 9.9 0 0 1 2.1-.4c5.8 0 9.4 6.4 9.4 6.4a17.6 17.6 0 0 1-3.4 4.3" />
      <path d="M6.6 7.4A17.3 17.3 0 0 0 2.6 12s3.6 6.4 9.4 6.4a9.3 9.3 0 0 0 4.1-.9" />
      <path d="M9.9 9.9a2.9 2.9 0 0 0 4.2 4.1" />
    </svg>
  );
}
