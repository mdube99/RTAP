import "./src/env";

import type { NextConfig } from "next";

const config: NextConfig = {
  // Allow local dev tooling to talk to the dev server when using the rtap.dev domain
  allowedDevOrigins: ["rtap.dev", "*.rtap.dev"],
};

export default config;
