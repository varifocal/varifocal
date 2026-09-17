import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
	const env = (locals as any).runtime?.env ?? (locals as any).env;

	if (!env?.PORTFOLIO_WORKFLOW) {
		return new Response(
			JSON.stringify({ error: 'Workflow binding not available' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } },
		);
	}

	const body = await request.json();
	const { action, name, email, message } = body;

	const instance = await env.PORTFOLIO_WORKFLOW.create({
		params: { action, name, email, message },
	});

	return new Response(
		JSON.stringify({ instanceId: instance.id }),
		{ status: 200, headers: { 'Content-Type': 'application/json' } },
	);
};

export const GET: APIRoute = async ({ url, locals }) => {
	const env = (locals as any).runtime?.env ?? (locals as any).env;
	const instanceId = url.searchParams.get('instanceId');

	if (!instanceId) {
		return new Response(
			JSON.stringify({ error: 'Missing instanceId parameter' }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } },
		);
	}

	if (!env?.PORTFOLIO_WORKFLOW) {
		return new Response(
			JSON.stringify({ error: 'Workflow binding not available' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } },
		);
	}

	const instance = await env.PORTFOLIO_WORKFLOW.get(instanceId);
	const status = await instance.status();

	return new Response(
		JSON.stringify(status),
		{ status: 200, headers: { 'Content-Type': 'application/json' } },
	);
};
