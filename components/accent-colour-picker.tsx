"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { useAccentColour } from "@/components/accent-colour-provider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const PRESETS = [
  { name: "Indigo", hex: "#6366f1" },
  { name: "Violet", hex: "#8b5cf6" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Cyan", hex: "#06b6d4" },
  { name: "Teal", hex: "#14b8a6" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Rose", hex: "#f43f5e" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Orange", hex: "#f97316" },
] as const;

export function AccentColourPicker() {
  const { accentColour, setAccentColour } = useAccentColour();
  const [customHex, setCustomHex] = useState("");

  const handleCustomSubmit = () => {
    const hex = customHex.startsWith("#") ? customHex : `#${customHex}`;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      setAccentColour(hex);
      setCustomHex("");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer"
        >
          <span
            className="inline-block size-4 shrink-0 rounded-full border border-border"
            style={{ backgroundColor: accentColour }}
          />
          <span>Accent Colour</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-64">
        <p className="mb-3 text-sm font-medium">Accent Colour</p>
        <div className="grid grid-cols-5 gap-2">
          {PRESETS.map((preset) => {
            const isActive =
              accentColour.toLowerCase() === preset.hex.toLowerCase();
            return (
              <button
                key={preset.hex}
                type="button"
                title={preset.name}
                onClick={() => setAccentColour(preset.hex)}
                className={cn(
                  "relative flex size-7 items-center justify-center rounded-full transition-transform hover:scale-110",
                  isActive && "ring-2 ring-offset-2 ring-offset-popover ring-current",
                )}
                style={{ backgroundColor: preset.hex, color: preset.hex }}
              >
                {isActive && (
                  <Check className="size-3.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" />
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={customHex}
            onChange={(e) => setCustomHex(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
            placeholder="#hex"
            className="h-8 flex-1 rounded-md border bg-transparent px-2 text-xs"
            maxLength={7}
          />
          <button
            type="button"
            onClick={handleCustomSubmit}
            className="h-8 rounded-md bg-primary px-3 text-xs text-primary-foreground"
          >
            Apply
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

