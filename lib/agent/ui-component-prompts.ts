/**
 * Shared OpenUI component prompts for agent nodes.
 * Each node imports the fragment relevant to its step so the LLM
 * knows which components are available and what props to emit.
 *
 * NOTE: The LLM should NOT emit JSON or component descriptors in its text output.
 * Component state is set programmatically by the node functions themselves.
 */

export const accountConnectorComponentPrompt = '';

export const userInfoCollectorComponentPrompt = '';

export const audienceCollectorComponentPrompt = '';

export const brandVoiceComponentPrompt = '';

export const completionComponentPrompt = '';

export const resumeSummaryComponentPrompt = '';
