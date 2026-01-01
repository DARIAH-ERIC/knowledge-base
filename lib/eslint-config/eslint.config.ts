import { defineConfig } from "eslint/config"

import preset from "./src/node.ts"

const config = defineConfig(preset)

export default config
