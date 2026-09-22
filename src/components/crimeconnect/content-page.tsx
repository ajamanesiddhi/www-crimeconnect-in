import type { ReactNode } from "react";
import { PublicShell } from "./public-shell";

export function ContentPage({ eyebrow, title, intro, children }:{eyebrow:string;title:string;intro:string;children:ReactNode}) {
  return <PublicShell><main><section className="border-b border-border bg-panel-strong"><div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8"><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p><h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight sm:text-5xl">{title}</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{intro}</p></div></section><div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">{children}</div></main></PublicShell>;
}

export const infoCardClass = "rounded-lg border border-border bg-card p-6 shadow-xl shadow-background/20";