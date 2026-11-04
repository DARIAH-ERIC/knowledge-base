import { twMerge } from "tailwind-merge";
import { createTV } from "tailwind-variants/lite";

/**
 * `tv` bound to `tailwind-merge`, so recipes resolve class conflicts with the same engine as the
 * direct `twMerge` calls. The default `tailwind-variants` entry would ship a second merger.
 *
 * Kept out of `primitive.ts`: that module is `"use client"`, and recipes also run on the server.
 */
export const tv = createTV({ twMerge });
