import { describe, it, expect } from "vitest";
import { buildTechniqueMap, type MitreTechniqueDTO } from "@/features/settings/components/import/buildTechniqueMap";

describe("buildTechniqueMap", () => {
  it("maps parent techniques and subtechniques with parent tactic", () => {
    const list: MitreTechniqueDTO[] = [
      {
        id: "T1098",
        name: "Account Manipulation",
        description: "Parent",
        url: "https://attack.mitre.org/techniques/T1098/",
        tactic: { id: "TA0005", name: "Defense Evasion" },
        subTechniques: [
          {
            id: "T1098.001",
            name: "Additional Cloud Roles",
            description: "Sub",
            url: "https://attack.mitre.org/techniques/T1098/001/",
          },
        ],
      },
    ];

    const map = buildTechniqueMap(list);
    const parent = map.get("T1098");
    const sub = map.get("T1098.001");

    expect(parent?.tactic?.id).toBe("TA0005");
    expect(parent?.name).toBe("Account Manipulation");
    expect(sub?.tactic?.id).toBe("TA0005"); // inherits tactic
    expect(sub?.name).toBe("Additional Cloud Roles");
  });
});

