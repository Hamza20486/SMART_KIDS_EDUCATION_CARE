export function assertSafeRestoreTarget(input: {
  target: string;
  currentDatabase?: string;
  allowProductionRestore?: boolean;
}) {
  const targetUrl = new URL(input.target);
  if (
    input.currentDatabase &&
    new URL(input.currentDatabase).toString() === targetUrl.toString()
  ) {
    throw new Error("Restore target must not equal the current application database");
  }
  const databaseName = targetUrl.pathname.replace(/^\//, "");
  if (
    !input.allowProductionRestore &&
    !/(restore|test|staging|drill)/i.test(databaseName)
  ) {
    throw new Error(
      "Restore target database name must include restore, test, staging, or drill",
    );
  }
  return targetUrl;
}
