import { logger } from '@/lib/logger';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  title: string;
  message: string;
  severity: AlertSeverity;
  source: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

export interface AlertingConfig {
  slackWebhookUrl?: string;
  genericWebhookUrl?: string;
  resendApiKey?: string;
  alertEmailFrom?: string;
  alertEmailTo?: string[];
  enabledChannels: ('slack' | 'webhook' | 'email')[];
}

let config: AlertingConfig | null = null;

export function initAlerting(cfg: AlertingConfig) {
  config = cfg;
  logger.info('alerting.initialized', { channels: cfg.enabledChannels });
}

function getConfig(): AlertingConfig | null {
  if (config) return config;
  const slackWebhookUrl = process.env.ALERT_SLACK_WEBHOOK_URL;
  const genericWebhookUrl = process.env.ALERT_GENERIC_WEBHOOK_URL;
  const resendApiKey = process.env.RESEND_API_KEY;
  const alertEmailFrom = process.env.ALERT_EMAIL_FROM;
  const alertEmailToRaw = process.env.ALERT_EMAIL_TO;
  const alertEmailTo = alertEmailToRaw ? alertEmailToRaw.split(',').map(s => s.trim()).filter(Boolean) : undefined;

  const channels: AlertingConfig['enabledChannels'] = [];
  if (slackWebhookUrl) channels.push('slack');
  if (genericWebhookUrl) channels.push('webhook');
  if (resendApiKey && alertEmailTo?.length) channels.push('email');

  if (channels.length === 0) return null;

  config = {
    slackWebhookUrl,
    genericWebhookUrl,
    resendApiKey,
    alertEmailFrom: alertEmailFrom ?? 'alerts@socialbeam.local',
    alertEmailTo,
    enabledChannels: channels,
  };
  return config;
}

const SEVERITY_EMOJI: Record<AlertSeverity, string> = {
  info: ':information_source:',
  warning: ':warning:',
  critical: ':rotating_light:',
};

const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  info: '#36a64f',
  warning: '#ff9900',
  critical: '#ff0000',
};

async function sendSlack(alert: Alert): Promise<void> {
  const cfg = getConfig();
  if (!cfg?.slackWebhookUrl) return;

  const emoji = SEVERITY_EMOJI[alert.severity];
  const body = {
    text: `${emoji} *[${alert.severity.toUpperCase()}] ${alert.title}*`,
    attachments: [
      {
        color: SEVERITY_COLOR[alert.severity],
        fields: [
          { title: 'Source', value: alert.source, short: true },
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Message', value: alert.message },
          ...(alert.metadata ? [{ title: 'Details', value: '```' + JSON.stringify(alert.metadata, null, 2) + '```' }] : []),
        ],
        footer: 'SocialBeam Alerting',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    const res = await fetch(cfg.slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      logger.warn('alerting.slack.send_failed', { status: res.status, statusText: res.statusText });
    }
  } catch (err) {
    logger.error('alerting.slack.error', { error: String(err) });
  }
}

async function sendWebhook(alert: Alert): Promise<void> {
  const cfg = getConfig();
  if (!cfg?.genericWebhookUrl) return;

  const payload = {
    ...alert,
    timestamp: alert.timestamp ?? new Date().toISOString(),
    environment: process.env.NODE_ENV,
  };

  try {
    const res = await fetch(cfg.genericWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Alert-Severity': alert.severity,
        'X-Alert-Source': alert.source,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logger.warn('alerting.webhook.send_failed', { status: res.status });
    }
  } catch (err) {
    logger.error('alerting.webhook.error', { error: String(err) });
  }
}

async function sendEmail(alert: Alert): Promise<void> {
  const cfg = getConfig();
  if (!cfg?.resendApiKey || !cfg.alertEmailTo?.length) return;

  const subject = `[${alert.severity.toUpperCase()}] ${alert.title}`;
  const html = `
    <h2>${alert.title}</h2>
    <p><strong>Severity:</strong> ${alert.severity}</p>
    <p><strong>Source:</strong> ${alert.source}</p>
    <p><strong>Time:</strong> ${alert.timestamp ?? new Date().toISOString()}</p>
    <hr />
    <p>${alert.message}</p>
    ${alert.metadata ? `<pre>${JSON.stringify(alert.metadata, null, 2)}</pre>` : ''}
  `.trim();

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: cfg.alertEmailFrom,
        to: cfg.alertEmailTo,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.warn('alerting.email.send_failed', { status: res.status, body: text });
    }
  } catch (err) {
    logger.error('alerting.email.error', { error: String(err) });
  }
}

export async function sendAlert(alert: Alert): Promise<void> {
  const cfg = getConfig();
  if (!cfg) {
    logger.warn('alerting.no_channels_configured', { title: alert.title });
    return;
  }

  logger.error('alerting.dispatch', {
    severity: alert.severity,
    source: alert.source,
    title: alert.title,
    channels: cfg.enabledChannels,
  });

  const tasks: Promise<void>[] = [];
  if (cfg.enabledChannels.includes('slack')) tasks.push(sendSlack(alert));
  if (cfg.enabledChannels.includes('webhook')) tasks.push(sendWebhook(alert));
  if (cfg.enabledChannels.includes('email')) tasks.push(sendEmail(alert));

  await Promise.allSettled(tasks);
}

export async function alertDatabaseFailure(error: string): Promise<void> {
  await sendAlert({
    title: 'Database Connection Failure',
    message: `The application cannot reach the database: ${error}`,
    severity: 'critical',
    source: 'health-check',
    metadata: { error },
  });
}

export async function alertPublishQueueBacklog(stuckCount: number, stuckPostIds: string[]): Promise<void> {
  await sendAlert({
    title: 'Publish Queue Backlog',
    message: `${stuckCount} posts are stuck in PUBLISHING status for >30 minutes.`,
    severity: stuckCount > 10 ? 'critical' : 'warning',
    source: 'publish-watchdog',
    metadata: { stuckCount, samplePostIds: stuckPostIds.slice(0, 10) },
  });
}

export async function alertStripeWebhookFailure(eventType: string, error: string): Promise<void> {
  await sendAlert({
    title: 'Stripe Webhook Failure',
    message: `Failed to process Stripe webhook event: ${eventType}`,
    severity: 'critical',
    source: 'stripe-webhook',
    metadata: { eventType, error },
  });
}

export async function alertHighErrorRate(errorsPerMinute: number): Promise<void> {
  await sendAlert({
    title: 'High Error Rate Detected',
    message: `Error rate is ${errorsPerMinute} errors/min (threshold: 10/min).`,
    severity: 'critical',
    source: 'error-rate-monitor',
    metadata: { errorsPerMinute },
  });
}
