"use client";

import { Component, type ReactNode } from "react";

// One bad value in a side panel must never blank the whole Brain (Annette Judd, 8 Oct: "Application error" opening
// some contacts). A panel that throws shows a short message instead, and the rest of the page keeps working.
export default class PanelBoundary extends Component<{ children: ReactNode; label?: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error("Panel failed", err);
  }
  render() {
    if (this.state.failed) return <p className="cc-err">{this.props.label ?? "This"} couldn&apos;t be shown just now. Close it and try again; the rest of the Brain is fine.</p>;
    return this.props.children;
  }
}
