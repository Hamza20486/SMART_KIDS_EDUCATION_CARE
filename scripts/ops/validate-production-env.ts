import { productionEnvironmentIssues } from "../../lib/ops/environment";

const issues = productionEnvironmentIssues(process.env);
if (issues.length) {
  console.error("Production environment validation failed:");
  for (const issue of issues) {
    console.error(`- ${issue.path || "environment"}: ${issue.message}`);
  }
  process.exitCode = 1;
} else {
  console.log("Production environment contract is valid.");
}
