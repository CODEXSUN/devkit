export type AgentStructuredPlan = {
  acceptance: string[];
  assumptions: string[];
  proposal: string[];
  risks: string[];
  tasks: string[];
  tests: string[];
};

const sections: Array<[keyof AgentStructuredPlan, RegExp]> = [
  ["proposal", /^#{1,3}\s*(?:proposal|recommended direction)\s*$/imu],
  ["assumptions", /^#{1,3}\s*assumptions?\s*$/imu],
  ["risks", /^#{1,3}\s*(?:risks?(?: and alternatives)?|alternatives?)\s*$/imu],
  ["tasks", /^#{1,3}\s*(?:implementation tasks?|tasks?|task plan)\s*$/imu],
  ["acceptance", /^#{1,3}\s*(?:acceptance criteria|acceptance checks?)\s*$/imu],
  ["tests", /^#{1,3}\s*(?:test plan|verification)\s*$/imu]
];

export function parseAgentStructuredPlan(text: string): AgentStructuredPlan | null {
  const plan: AgentStructuredPlan = {
    acceptance: [],
    assumptions: [],
    proposal: [],
    risks: [],
    tasks: [],
    tests: []
  };
  let active: keyof AgentStructuredPlan | null = null;

  for (const line of text.split(/\r?\n/u)) {
    const section = sections.find(([, pattern]) => pattern.test(line));
    if (section) {
      active = section[0];
      continue;
    }
    if (/^#{1,3}\s+/u.test(line)) {
      active = null;
      continue;
    }
    const value = listValue(line);
    if (active && value) plan[active].push(value);
  }

  return plan.tasks.length ? plan : null;
}

function listValue(line: string) {
  const match = line.match(/^\s*(?:[-*+] |\d+[.)] )(?:\[[ xX]\]\s*)?(.+?)\s*$/u);
  return match?.[1]?.trim() ?? "";
}
