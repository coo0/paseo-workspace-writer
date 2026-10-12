import type { PluginServerContext } from "@getpaseo/plugin/server";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const WORKSPACE_ID_FILENAME = ".paseo-workspace-id";

// 共用的写入逻辑
function writeWorkspaceId(agent: { workspaceId: string | null; cwd: string }) {
  if (!agent.workspaceId) return;
  if (!agent.cwd) return;

  try {
    mkdirSync(agent.cwd, { recursive: true });
    writeFileSync(
      join(agent.cwd, WORKSPACE_ID_FILENAME),
      agent.workspaceId + "\n",
    );
  } catch {
    // daemon 侧出错不能影响主流程，吞掉
  }
}

export default function contribute(server: PluginServerContext) {
  // agent 被创建时写一次（首次引导的关键时机）
  server.on("agent.created", async ({ agent }) => {
    writeWorkspaceId(agent);
  });

  // 每次 turn 开始时再写一次（保证文件始终最新）
  server.on("agent.turn_started", async ({ agent }) => {
    writeWorkspaceId(agent);
  });

  return () => {};
}
