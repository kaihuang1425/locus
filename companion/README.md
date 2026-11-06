# Locus planner companion (optional)

Locus can plan a day, week, or month with an AI assistant. The planner lives in the
new tab: **Calendar → Plan with AI**. Copying the prompt and pasting the reply works
with no extra software. This folder adds an optional local companion so MCP clients
(Claude Code or Claude Desktop, Codex CLI or desktop, Antigravity) can send drafts to
Locus directly, and so Locus can start an opt-in local runner.

Nothing here touches the network. The companion is two Node.js programs that talk
only over stdin/stdout:

| Program | Started by | Purpose |
|---|---|---|
| `mcp-server.js` | your MCP client | Tools `locus_get_plan_request`, `locus_submit_plan_draft`, `locus_get_draft_status`; prompt `locus-plan`. |
| `native-host.js` | Chrome or Edge, after you choose **Connect companion** | Pairs one browser profile, publishes the plan brief you share, hands queued drafts to Locus, records Apply/Dismiss. |
| `locus-planner.js` | you | Install, status, client config snippets, unpair, uninstall. |

Both programs share one validator and one draft queue with the extension
(`../plan-contract.js`). A draft is only a proposal: Locus re-checks it against the
plan you have open, shows a preview, and adds nothing to the Calendar until you choose
**Add N tasks**. Undo works as for any other Locus change.

## Boundaries

- No listener: no port, socket, or HTTP server. MCP is stdio; the browser link is
  Chromium Native Messaging.
- No browser storage access: the companion never reads or writes Chrome storage.
  Locus pulls drafts and writes its own state through its normal acknowledged path.
- No default access to tabs or saved pages. A plan brief contains only what you typed
  in the planner, plus your Calendar reminder *times* (never titles) if you tick
  "Share my Calendar reminder times".
- The extension keeps `connect-src 'none'` and has no host permissions.
  `nativeMessaging` is an **optional** permission that Locus requests only when you
  click **Connect companion**.
- No provider keys are stored anywhere. Local runners use the CLI's own sign-in.

Data lives in `%LOCALAPPDATA%\Locus\Planner` (override with `LOCUS_PLANNER_HOME` or
`--home <dir>`):

```
pairings.json                       pairing ids and a SHA-256 of each profile key
pairings/<id>/requests/<plan>.json  the plan briefs you shared (newest 20)
pairings/<id>/queue/<draft>.json    drafts: queued → delivered → applied | dismissed | rejected | superseded | expired
runners.json                        optional local runners (absent by default)
host/                               native host manifest and launcher written by install
```

Queue limits: 25 waiting drafts per profile, 256 KiB per draft, waiting drafts expire
after 14 days, 200 finished entries kept for duplicate detection.

## Windows setup

Requirements: Node.js 20 or newer (tested with 26.4.0), Locus loaded unpacked in
Chrome or Edge.

1. Find the Locus id on `chrome://extensions` or `edge://extensions` (32 letters).
2. Install the host for that id. From the repository root:

   ```bash
   node companion/locus-planner.js install --extension-id <locus-id> --browser chrome
   ```

   Use `--browser edge` or `--browser all` as needed; add `--dry-run` to write the host
   files and print the exact `reg.exe` command without running it. This writes
   `%LOCALAPPDATA%\Locus\Planner\host\com.locus.planner.json` and
   `locus-planner-host.cmd` (which runs this checkout's `native-host.js` with the
   absolute path of the current `node.exe`), then sets the default value of
   `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.locus.planner` and/or
   `HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.locus.planner` to that
   manifest. Edge also falls back to the Chrome key. Run it again if you move the
   checkout or reinstall Node.
3. In Locus open **Calendar → Plan with AI → Connect companion** and allow
   "Communicate with cooperating native applications". The sheet shows the pairing id
   (for example `lp-p4tf-w4em`). Each browser profile gets its own pairing and queue.
4. Fill in the plan and choose **Share with companion**. MCP clients can now read it.
5. Add the MCP server to your client (next section), ask it to plan, then choose
   **Check for drafts** in Locus. Preview, untick anything you don't want, and choose
   **Add N tasks**.

`node companion/locus-planner.js status` shows the registration, pairings, and queue
counts. `node companion/locus-planner.js uninstall --browser all` removes the registry
keys and host files; delete `%LOCALAPPDATA%\Locus\Planner` to remove drafts and
pairings too.

## MCP client configuration

Print an exact snippet with absolute paths for this machine:

```bash
node companion/locus-planner.js mcp-config --client claude --pairing <pairing-id>
```

```bash
node companion/locus-planner.js mcp-config --client codex --pairing <pairing-id>
```

`--pairing` can be omitted while only one browser profile is paired. `--client` is a
label shown in Locus next to each draft; a newer draft from the same label replaces an
older one Locus has not received yet.

- **Claude Code**: `claude mcp add --scope user locus -- "C:\Program Files\nodejs\node.exe" "<repo>\companion\mcp-server.js" --pairing <id> --client claude-code`
  (for a one-off run without saving config: `claude -p --mcp-config <file.json> --strict-mcp-config`, which is how this pass ran it)
- **Claude Desktop**: add the JSON from `mcp-config --client claude` under
  `mcpServers` in its config file, then restart Claude Desktop.
- **Codex CLI and Codex desktop** share `~/.codex/config.toml`:
  `codex mcp add locus -- "C:\Program Files\nodejs\node.exe" "<repo>\companion\mcp-server.js" --pairing <id> --client codex`,
  or paste the TOML from `mcp-config --client codex`. In `codex exec` runs, the server
  table needs `default_tools_approval_mode = "approve"` or the tool call waits for an
  approval that cannot arrive.
- **Antigravity (app, IDE, CLI)**: put the `mcp-config --client antigravity` JSON in
  `~/.gemini/config/mcp_config.json` (all projects) or `<workspace>/.agents/mcp_config.json`.
  Antigravity asks before running MCP tools unless allowed with `mcp(locus/*)`; a
  `deny` rule for `mcp(*)` blocks it.

Prompt profiles (chosen in the planner, also available as the MCP prompt
`locus-plan`): `claude-xml` (XML sections with a worked example), `codex-tool` (short
objective, exact tool and schema), `codex-compact` (for Spark or other short-context
models), `gemini-structured` (direct goal and constraints, native structured output).
The model field never changes the prompt; it is passed to local runners only.

## Optional local runners

With a runner configured, **Generate draft** in the planner sends the selected plan
brief to the companion, which runs your signed-in CLI in an empty temporary folder,
validates the reply with the same contract, and queues it. Runners are off unless
`runners.json` exists and lists one with `"enabled": true`. Copy
`runners.example.json` to `%LOCALAPPDATA%\Locus\Planner\runners.json`, set absolute
executable paths, and enable the ones you use. Placeholders: `{prompt}`,
`{schema_file}`, `{schema_json}`, `{output_file}`, `{model}` (via `model_args`).
The command runs without a shell; output is read from stdout or the output file and,
with `json_path`, from one field of the CLI's JSON envelope.

Only the `antigravity` entry was run as a runner in this pass. The `claude` and
`codex` entries use flags checked against `claude --help` (2.1.318) and
`codex exec --help` (0.164.0) but were not run end to end as runners; check their
output field before enabling them.

## What this pass exercised (2026-11-06, Windows 11, Node 26.4.0)

| Surface | Result |
|---|---|
| Locus planner in a throwaway Edge 156.0.4314.58 profile (CDP-driven) | Plan create/save/reload, all four prompt profiles, Copy prompt, paste import with prose and tags, invalid date, DST gap (America/New_York 2027-03-14 02:30), conflict, untimed block, fixed commitment, Apply (exact UTC reminders across the DST change), toast Undo, re-apply, duplicate import ("already added", Apply disabled), zh-TW repaint, Escape focus return, Welcome guard, 400 px layout. |
| Claude Code CLI 2.1.318 (`claude -p --mcp-config … --strict-mcp-config`, model `claude-sonnet-5-5`) | Called `locus_submit_plan_draft`; draft queued and later previewed and applied in Locus. |
| Codex CLI 0.164.0 (`codex exec … -c mcp_servers.locus.*`, `gpt-6.1-sol`, then `gpt-6-luna` with the compact profile) | Both called `locus_submit_plan_draft`; the second replaced the first while waiting (same client label), which is why `--client` now wins over the client's reported name. |
| Antigravity CLI 1.4.9 as a local runner (`gemini-3.8-flash-low`, `--json-schema`) | Native structured output, validated and queued through `native-host.js` in 22 s; previewed in Locus. |
| `native-host.js` driven over its real stdio framing | Pairing, offline queue, pull, redelivery after reconnect (deliveries=2, 3), ack, status over MCP. |
| `install --dry-run` and the generated `locus-planner-host.cmd` started through `cmd.exe /d /s /c` as Chromium does | Manifest with one exact origin; framed `hello` answered and a pairing created; registry untouched. |

Not exercised: Chrome/Edge launching the host itself (the HKCU registration step was
not run in this pass), so **Connect companion**, **Share with companion**, **Check for
drafts**, and **Generate draft** were not clicked in a browser; Claude Desktop, Codex
desktop, Antigravity's own MCP client (its CLI settings on this machine deny
`mcp(*)`), and Gemini CLI (not installed).
