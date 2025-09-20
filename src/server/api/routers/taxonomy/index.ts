import { createTRPCRouter } from "@/server/api/trpc";
import { threatActorsRouter } from "./threat-actors";
import { crownJewelsRouter } from "./crown-jewels";
import { tagsRouter } from "./tags";
import { toolCategoriesRouter } from "./tool-categories";
import { toolsRouter } from "./tools";
import { logSourcesRouter } from "./log-sources";
import { mitreRouter } from "./mitre";

export const taxonomyRouter = createTRPCRouter({
  threatActors: threatActorsRouter,
  crownJewels: crownJewelsRouter,
  tags: tagsRouter,
  toolCategories: toolCategoriesRouter,
  tools: toolsRouter,
  logSources: logSourcesRouter,
  mitre: mitreRouter,
});

