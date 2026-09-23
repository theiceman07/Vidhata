import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The type scale in tailwind.config.ts uses names, not t-shirt sizes, so
// tailwind-merge has to be told they are font sizes. Without this it reads
// `text-notation` as a colour and drops it whenever a colour class follows.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: ["display", "h1", "h2", "h3", "lead", "body", "meta", "small", "notation", "label"],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
