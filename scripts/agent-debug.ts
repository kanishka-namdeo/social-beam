#!/usr/bin/env npx tsx
/**
 * Agent Debug CLI — inspect LangGraph checkpoints, trace history, and graph structure.
 *
 * Usage:
 *   npx tsx scripts/agent-debug.ts graph              — Print Mermaid diagram
 *   npx tsx scripts/agent-debug.ts traces <threadId>   — Print trace history for a thread
 *   npx tsx scripts/agent-debug.ts report <threadId>   — Print full debug report
 *   npx tsx scripts/agent-debug.ts interrupts           — Print interrupt lifecycle log
 */

import { getGraphMermaid, getGraphStructure } from '@/lib/agent/graph';
import { getTraceHistory, getInterruptLog, getAgentDebugReport } from '@/lib/agent/debug';

const command = process.argv[2];

function main(): void {
  switch (command) {
    case 'graph':
      printGraph();
      break;
    case 'traces':
      printTraces(process.argv[3]);
      break;
    case 'report':
      printReport(process.argv[3]);
      break;
    case 'interrupts':
      printInterrupts();
      break;
    default:
      printHelp();
      break;
  }
}

function printGraph(): void {
  const structure = getGraphStructure();

  console.log('\n=== SocialBeam Onboarding Graph Structure ===\n');
  console.log(`Nodes: ${structure.nodes.length}`);
  for (const node of structure.nodes) {
    console.log(`  • ${node}`);
  }

  console.log(`\nEdges: ${structure.edges.length}`);
  for (const [from, to] of structure.edges) {
    console.log(`  ${from} → ${to}`);
  }

  console.log(`\nConditional Routers: ${structure.conditionals.length}`);
  for (const cond of structure.conditionals) {
    console.log(`  ${cond.from} [${cond.router}] → ${cond.routes.join(', ')}`);
  }

  console.log('\n=== Mermaid Diagram ===\n');
  console.log(getGraphMermaid());
  console.log();
}

function printTraces(threadId?: string): void {
  if (!threadId) {
    console.log('Usage: npx tsx scripts/agent-debug.ts traces <threadId>\n');
    return;
  }

  const traces = getTraceHistory(threadId);

  if (traces.length === 0) {
    console.log(`No traces found for thread: ${threadId}\n`);
    return;
  }

  console.log(`\n=== Trace History: ${threadId} ===\n`);
  console.log(`${'Step'.padStart(6)} ${'Node'.padEnd(30)} ${'Duration'.padStart(10)} ${'Keys Changed'.padEnd(20)} Status`);
  console.log('-'.repeat(85));

  for (const trace of traces) {
    const status = trace.error ? 'ERROR' : 'OK';
    const keys = trace.keysUpdated?.slice(0, 3).join(', ') ?? '';
    console.log(
      `${String(trace.step).padStart(6)} ${trace.node.padEnd(30)} ${String(trace.durationMs ?? 0).padStart(10)}ms ${keys.padEnd(20)} ${status}`,
    );
    if (trace.error) {
      console.log(`  Error: ${trace.error}`);
    }
    if (trace.stateDiff) {
      const parts: string[] = [];
      if (trace.stateDiff.added.length) parts.push(`+${trace.stateDiff.added.join(',')}`);
      if (trace.stateDiff.changed.length) parts.push(`~${trace.stateDiff.changed.join(',')}`);
      if (trace.stateDiff.removed.length) parts.push(`-${trace.stateDiff.removed.join(',')}`);
      if (parts.length) console.log(`  State: ${parts.join(' | ')}`);
    }
  }

  const totalMs = traces.reduce((sum, t) => sum + (t.durationMs ?? 0), 0);
  const errors = traces.filter((t) => t.error).length;
  console.log(`\nTotal: ${traces.length} nodes | ${totalMs}ms | ${errors} errors\n`);
}

function printReport(threadId?: string): void {
  const report = getAgentDebugReport(threadId ?? undefined);

  console.log('\n=== Agent Debug Report ===\n');
  console.log(`Total node executions: ${report.summary.totalNodes}`);
  console.log(`Total duration: ${report.summary.totalDurationMs}ms`);
  console.log(`Average duration: ${report.summary.avgDurationMs}ms`);
  console.log(`Errors: ${report.summary.errorNodes}`);

  if (report.interrupts.length > 0) {
    console.log(`\nInterrupt events: ${report.interrupts.length}`);
    for (const evt of report.interrupts) {
      const wait = evt.waitDurationMs ? ` (${evt.waitDurationMs}ms)` : '';
      console.log(`  [${evt.timestamp}] ${evt.type} → ${evt.node} at step "${evt.step}"${wait}`);
    }
  }

  if (report.trace.length > 0) {
    console.log('\nTimeline:');
    for (const t of report.trace) {
      const marker = t.error ? '✗' : '✓';
      console.log(`  ${marker} [${t.timestamp}] ${t.node} (${t.durationMs ?? 0}ms)`);
    }
  }

  console.log();
}

function printInterrupts(): void {
  const interrupts = getInterruptLog();

  if (interrupts.length === 0) {
    console.log('No interrupt events recorded.\n');
    return;
  }

  console.log('\n=== Interrupt Lifecycle Log ===\n');
  for (const evt of interrupts) {
    console.log(
      `[${evt.timestamp}] ${evt.type.toUpperCase()} ${evt.node}`
      + ` (thread: ${evt.threadId}, step: ${evt.step})`,
    );
  }
  console.log();
}

function printHelp(): void {
  console.log(`
Agent Debug CLI — Inspect LangGraph agent execution

Commands:
  graph              Print graph structure and Mermaid diagram
  traces <threadId>  Print node execution trace history for a thread
  report <threadId>  Print full debug report with summary stats
  interrupts         Print interrupt lifecycle event log
  help               Show this help message

Examples:
  npx tsx scripts/agent-debug.ts graph
  npx tsx scripts/agent-debug.ts traces abc-123-thread-id
  npx tsx scripts/agent-debug.ts report abc-123-thread-id
  npx tsx scripts/agent-debug.ts interrupts
`);
}

main();
