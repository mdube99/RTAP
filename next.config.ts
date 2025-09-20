import "./src/env";

import type { NextConfig } from "next";

const config: NextConfig = {
  // Allow local dev tooling to talk to the dev server when using the ttpx.dev domain
  allowedDevOrigins: ["ttpx.dev", "*.ttpx.dev"],
};

export default config;
