import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
	const { appId, meetingId, participantName, presetName } = await request.json();

	const apiToken = (import.meta as any).env?.CLOUDFLARE_API_TOKEN
		?? (globalThis as any).process?.env?.CLOUDFLARE_API_TOKEN;

	if (!apiToken) {
		return new Response(
			JSON.stringify({ error: 'CLOUDFLARE_API_TOKEN not configured' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } },
		);
	}

	const accountId = (import.meta as any).env?.CLOUDFLARE_ACCOUNT_ID
		?? (globalThis as any).process?.env?.CLOUDFLARE_ACCOUNT_ID;

	if (!accountId) {
		return new Response(
			JSON.stringify({ error: 'CLOUDFLARE_ACCOUNT_ID not configured' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } },
		);
	}

	const res = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/kit/${appId}/meetings/${meetingId}/participants`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiToken}`,
			},
			body: JSON.stringify({
				name: participantName,
				preset_name: presetName,
			}),
		},
	);

	const data = await res.json();

	if (!data.success) {
		return new Response(
			JSON.stringify({ error: data.errors }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } },
		);
	}

	return new Response(
		JSON.stringify({ authToken: data.result.authToken }),
		{ status: 200, headers: { 'Content-Type': 'application/json' } },
	);
};
