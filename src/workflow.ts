import { WorkflowEntrypoint, WorkflowStep } from 'cloudflare:workers';
import type { WorkflowEvent } from 'cloudflare:workers';

type Params = {
	action: 'process-contact' | 'generate-report';
	email?: string;
	message?: string;
	name?: string;
};

export class PortfolioWorkflow extends WorkflowEntrypoint<Env, Params> {
	async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
		const { action } = event.payload;

		if (action === 'process-contact') {
			const validated = await step.do('validate-input', async () => {
				const { name, email, message } = event.payload;
				if (!name || !email || !message) {
					throw new Error('Missing required fields: name, email, message');
				}
				return { name, email, message, timestamp: new Date().toISOString() };
			});

			const stored = await step.do('store-message', async () => {
				return {
					id: crypto.randomUUID(),
					...validated,
					status: 'received',
				};
			});

			const notified = await step.do('send-notification', {
				retries: { limit: 3, delay: '5 seconds', backoff: 'linear' },
			}, async () => {
				return {
					notification: `New contact from ${stored.name} (${stored.email})`,
					storedId: stored.id,
				};
			});

			return notified;
		}

		if (action === 'generate-report') {
			const data = await step.do('collect-data', async () => {
				return {
					generatedAt: new Date().toISOString(),
					visits: 0,
				};
			});

			await step.sleep('buffer', '5 seconds');

			const report = await step.do('compile-report', async () => {
				return {
					...data,
					status: 'complete',
				};
			});

			return report;
		}

		throw new Error(`Unknown action: ${action}`);
	}
}
