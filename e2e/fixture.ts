import path from "node:path";

export type E2EFixture = {
  organizationId: string;
  childId: string;
  foreignChildId: string;
  unassignedClassId: string;
  privateMediaId: string;
};

export const fixturePath = path.join(process.cwd(), ".e2e-state.json");
