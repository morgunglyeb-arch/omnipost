import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { brandVoice, loadConfig } from "../src/config.js";
import { hashSource } from "../src/cache.js";
import { RepurposedSchema, type Repurposed } from "../src/ai.js";
import { enforceConstraints } from "../src/enforce.js";
import { planSchedule } from "../src/schedule.js";
import { writeJsonFile } from "../src/outputs.js";
import { FileSource } from "../src/sources.js";

const SAMPLE: Repurposed = {
  hooks: [
    "Most AI advice for small businesses is written for companies that don't exist. Here's what actually works when you have ten people and no data team.",
    "Stop buying AI tools. Start picking one painful task. Three months in, you'll have a workday a week back across your team — and zero shelfware.",
    "The gap between 'AI is interesting' and 'AI is saving us five hours a week' is shorter than it looks. The trick is picking the right first job.",
  ],
  x_thread: [
    "Most AI strategy advice for small businesses is written for companies that don't exist. It assumes a data team, clean systems, and a six-month pilot. If you have ten people and one ops manager, that playbook is useless. Here is the version that actually works.",
    "The most common failure mode is buying tools before solving a problem. Someone reads a thread on Sunday, by Monday the team has five new subscriptions, by Friday three are unused, and by next quarter all five are still being billed.",
    "The opposite failure is worse: building a custom AI system when the actual problem is a fifteen-line script. We have seen founders pay an ML engineer for a smart classifier that ended up doing what a SQL CASE statement would have done at zero cost.",
    "A good first AI workflow has four properties. It is repetitive, so savings compound. It is text-heavy, so a language model can help. It tolerates a small error rate, so guardrails stay cheap. It has a clear before/after metric you can point at.",
    "Real examples we have seen: a three-person law firm cut a four-hour intake summarization down to forty minutes. A small e-commerce store dropped support response time from eleven hours to ninety minutes by drafting replies for a human to approve.",
    "Notice what those have in common. The AI did not replace the expert. It removed the most boring part of the expert's job — the part eating their attention without using their skill. That is the entire game.",
    "The sequence that almost always works: pick the most annoying recurring task. Write down what good output looks like, manually, three times. Start with an off-the-shelf tool, not a custom build. Keep a human reviewer for at least four weeks.",
    "Honest math: tooling runs $30 to $150 per workflow per month, plus 10 to 20 hours of setup. If the workflow saves three hours a week at $50 an hour, it pays back inside the first month. Nothing flashy. Compound is what gets you the workday back.",
    "If after two months no one on your team has voluntarily asked for AI help on a second task, the first workflow was the wrong one. Pause it, pick a different one, retry. The cost of switching is small. The cost of pretending a bad fit works is huge.",
  ],
  linkedin_post:
    "Most AI strategy advice aimed at small businesses is written for companies that don't exist.\n\nIt assumes a dedicated data team, clean systems of record, and the budget to run a six-month pilot before anyone asks about ROI. If you run a ten-person agency or a niche e-commerce brand with one ops manager, that playbook is useless.\n\nThe gap between \"AI is interesting\" and \"AI is saving us five hours a week\" is shorter than it looks — provided you stop trying to do everything and pick the right first job.\n\nA good first workflow has four properties:\n- It is repetitive, so the savings compound.\n- It is text-heavy, so a language model can actually help.\n- It tolerates a small error rate, so you don't overspend on guardrails.\n- It has a clear before/after metric — minutes saved, response time, conversion.\n\nReal examples from the last twelve months:\n- A three-person law firm cut a four-hour weekly intake summarization to forty minutes.\n- A small e-commerce store dropped support response time from eleven hours to ninety minutes by drafting replies for a human to approve. CSAT went up, not down, because drafts arrived faster than the perfect-but-late versions.\n- A marketing agency stopped writing weekly client recaps by hand. A strategist edits each AI draft in under five minutes, and clients say the recaps feel more thorough.\n\nNotice what they share. The AI did not replace the expert. It removed the most boring part of the expert's job — the part eating their attention without using their skill.\n\nThe sequence that almost always works: pick the most annoying recurring task, write down what good looks like, start with an off-the-shelf tool, keep a human reviewer for at least four weeks, measure time-saved and error rate, and only then wire it into Slack and your CRM.\n\nReply with your biggest content bottleneck — happy to brainstorm.",
  instagram_caption:
    "Most AI advice for small businesses is written for companies that don't exist.\n\nIt assumes a data team, clean systems, and a six-month pilot.\n\nWhat actually works at ten-person scale:\n\n→ Pick the most annoying recurring task, not the most exciting one.\n→ Write down what good output looks like, by hand, three times.\n→ Start with an off-the-shelf tool. Resist the urge to build.\n→ Keep a human reviewer in the loop for at least four weeks.\n→ Measure two numbers: time saved per occurrence, and error rate vs the human version.\n\nThe boring version of this beats the trendy version every single time. Three months in, you can quietly buy back a full workday a week across your team — without anyone touching the word \"transformation\".\n\nReply with your biggest content bottleneck — happy to brainstorm. 👋",
  hashtags: [
    "smallbusiness",
    "aitools",
    "automation",
    "contentstrategy",
    "founders",
    "productivity",
    "indiehackers",
    "workflowautomation",
    "buildinpublic",
  ],
  pull_quotes: [
    "The AI did not replace the expert. It removed the most boring part of the expert's job.",
    "Most 'AI failed us' stories are really 'we removed the reviewer too fast' stories.",
    "You are not measuring AI adoption. You are measuring whether the right things happen faster, with the same or better quality.",
    "Boredom is a great signal. If someone on your team groans every Monday at the same thing, that is your candidate.",
    "Done the boring way, the next twelve months quietly buy back a workday a week. Done the trendy way, they burn your tooling budget and your team's patience.",
  ],
  newsletter_blurb:
    "Most AI playbooks for small businesses assume a data team and a six-month pilot. You probably have neither. The version that actually works is unglamorous: pick the most annoying recurring task, write down what good output looks like by hand, start with an off-the-shelf assistant, and keep a human reviewer in the loop for at least four weeks. Measure two numbers — time saved per occurrence, and error rate against the human version. Three months in, the right first job quietly buys back a workday a week across your team. Reply with your biggest content bottleneck — happy to brainstorm.",
};

async function main(): Promise<void> {
  const cfg = loadConfig();
  const brand = brandVoice(cfg);

  const source = await new FileSource(cfg.INPUT_PATH).read();
  const hash = hashSource(source.text, JSON.stringify(brand));

  const validated = RepurposedSchema.parse(SAMPLE);
  const bundle = enforceConstraints(validated);
  const schedule = planSchedule(bundle, { days: cfg.SCHEDULE_DAYS });

  await mkdir(cfg.CACHE_DIR, { recursive: true });
  const cachePath = join(cfg.CACHE_DIR, `${hash}.json`);
  await writeJsonFile(cachePath, {
    hash,
    cached_at: new Date().toISOString(),
    provider: "anthropic",
    source_title: source.title,
    data: validated,
  });

  await mkdir("docs", { recursive: true });
  await writeJsonFile("docs/sample.json", {
    source_title: source.title,
    source_excerpt: source.text.slice(0, 800),
    bundle,
    schedule,
    generated_at: new Date().toISOString(),
  });

  console.log(`[gen-demo] wrote cache:   ${cachePath}`);
  console.log(`[gen-demo] wrote sample:  docs/sample.json`);
  console.log(`[gen-demo] source hash:   ${hash}`);
  console.log(
    `[gen-demo] tweets=${bundle.x_thread.length}, longest=${Math.max(0, ...bundle.x_thread.map((t) => t.length))}, hashtags=${bundle.hashtags.length}`,
  );
}

main().catch((err) => {
  console.error("[gen-demo] fatal:", err);
  process.exit(1);
});
