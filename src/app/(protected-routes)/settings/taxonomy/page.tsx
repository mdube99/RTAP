import ThreatActorsTab from "@features/settings/components/threat-actors-tab";
import CrownJewelsTab from "@features/settings/components/crown-jewels-tab";
import TagsTab from "@features/settings/components/tags-tab";
import ToolCategoriesTab from "@features/settings/components/tool-categories-tab";
import ToolsTab from "@features/settings/components/tools-tab";
import LogSourcesTab from "@features/settings/components/log-sources-tab";

export default function TaxonomyPage() {
  return (
    <div className="space-y-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
          Taxonomy
        </h1>
      </div>

      <ThreatActorsTab />
      <CrownJewelsTab />
      <TagsTab />
      <ToolCategoriesTab />
      <ToolsTab />
      <LogSourcesTab />
    </div>
  );
}
