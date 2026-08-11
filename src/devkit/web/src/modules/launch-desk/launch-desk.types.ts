export type LaunchDeskInput = {
  productBrief: string;
  audience: string;
  launchDate: string;
  constraints: string;
  availableAssets: string[];
};

export type LaunchDeskStreamEvent =
  | { type: "run.started"; model: string; trace: boolean }
  | { type: "tool.progress"; name: string; status: "started" | "completed" }
  | { type: "text.delta"; delta: string }
  | { type: "run.completed" }
  | { type: "run.failed"; message: string };

export type CodexStatus = {
  available: boolean;
  connected: boolean;
  accountType: string | null;
  email: string | null;
  planType: string | null;
  error: string | null;
};

export type DeviceLogin = {
  type: "chatgptDeviceCode";
  loginId: string;
  verificationUrl: string;
  userCode: string;
};

export type BrowserLogin = {
  type: "chatgpt";
  loginId: string;
  authUrl: string;
};
