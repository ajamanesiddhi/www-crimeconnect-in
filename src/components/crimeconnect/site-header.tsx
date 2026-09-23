import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Brand } from "./brand";
import { Button } from "@/components/ui/button";

const links = [{to:"/",label:"Home"},{to:"/features",label:"Features"},{to:"/how-it-works",label:"How It Works"},{to:"/safety-map",label:"Safety Map"},{to:"/about",label:"About"}] as const;

export function SiteHeader() {
  const [open,setOpen]=useState(false);
  return <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl"><div className="mx-auto grid h-20 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 sm:px-6 lg:flex lg:px-8">
    <Brand />
    <nav className="hidden flex-1 justify-center gap-1 lg:flex">{links.map(l=><Link key={l.to} to={l.to} activeOptions={{exact:l.to==="/"}} className="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground" activeProps={{className:"text-foreground bg-accent"}}>{l.label}</Link>)}</nav>
    <div className="hidden items-center gap-2 lg:flex"><Button asChild variant="ghost"><Link to="/auth" search={{mode:"login"}}>Login</Link></Button><Button asChild variant="premium"><Link to="/auth" search={{mode:"signup"}}>Get Started</Link></Button></div>
    <Button variant="ghost" size="icon" className="lg:hidden" onClick={()=>setOpen(v=>!v)} aria-label="Toggle navigation">{open?<X/>:<Menu/>}</Button>
  </div>{open&&<div className="border-t border-border px-4 py-4 lg:hidden"><nav className="grid gap-1">{links.map(l=><Link key={l.to} to={l.to} onClick={()=>setOpen(false)} className="rounded-md px-3 py-3 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground">{l.label}</Link>)}<Button asChild className="mt-2"><Link to="/auth" search={{mode:"login"}}>Login / Get Started</Link></Button></nav></div>}</header>;
}