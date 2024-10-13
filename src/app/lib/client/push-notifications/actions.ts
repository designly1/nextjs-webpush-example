'use server';

import webpush, { PushSubscription } from 'web-push';
import { cookies } from 'next/headers';

import { DEVICE_ID_KEY } from './provider';

type T_KvListKeyItem = {
	name: string;
	expiration: number;
};

interface I_KvListResponse {
	success: boolean;
	keys: {
		list_complete: boolean;
		keys: T_KvListKeyItem[];
		cacheStatus: string | null;
	};
}

interface I_SubscribeUser {
	sub: PushSubscription;
	deviceId: string;
}

const KV_EXP = 60 * 30; // 30 minutes
const KV_PREFIX = 'example-push::';

export async function subscribeUser(props: I_SubscribeUser): Promise<ApiResponse> {
	const { sub, deviceId } = props;

	try {
		const key = `${KV_PREFIX}${deviceId}`;

		const payload = {
			key,
			value: JSON.stringify(sub),
			ex: KV_EXP,
		};

		const response = await fetch(`${process.env.KV_API_URL}/set?ts=${Date.now()}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				API_KEY: process.env.KV_API_KEY!,
			},
			body: JSON.stringify(payload),
			cache: 'no-store',
		});

		if (!response.ok) {
			throw new Error('Failed to subscribe user');
		}

		return { success: true };
	} catch (err) {
		console.error(err);
		return { success: false, message: 'Failed to subscribe user' };
	}
}

interface I_UnsubscribeUser {
	deviceId: string;
}

export async function unsubscribeUser(props: I_UnsubscribeUser): Promise<ApiResponse> {
	const { deviceId } = props;

	try {
		const key = `${KV_PREFIX}${deviceId}`;

		const response = await fetch(`${process.env.KV_API_URL}/del?ts=${Date.now()}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				API_KEY: process.env.KV_API_KEY!,
			},
			body: JSON.stringify({ key }),
			cache: 'no-store',
		});

		if (!response.ok) {
			throw new Error('Failed to unsubscribe user');
		}

		return { success: true };
	} catch (err) {
		console.error(err);
		return { success: false, message: 'Failed to unsubscribe user' };
	}
}

interface I_CheckSubscription {
	deviceId: string;
}

export async function checkSubscription(props: I_CheckSubscription): Promise<ApiResponse> {
	const { deviceId } = props;
	const prefix = `${KV_PREFIX}${deviceId}`;

	try {
		const response = await fetch(`${process.env.KV_API_URL}/list?ts=${Date.now()}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				API_KEY: process.env.KV_API_KEY!,
			},
			body: JSON.stringify({ prefix }),
			cache: 'no-store',
		});

		if (!response.ok) {
			throw new Error('Failed to check subscription');
		}

		const data = (await response.json()) as I_KvListResponse;

		if (!data.success) {
			throw new Error('Failed to check subscription');
		}

		const key = data.keys.keys.find(k => k.name === `${KV_PREFIX}${deviceId}`);

		if (key) {
			return { success: true };
		}

		return { success: false, message: 'Subscription does not exist' };
	} catch (err) {
		console.error(err);
		return { success: false, message: 'Failed to check subscription' };
	}
}

export interface I_SendPushNotification {
	deviceId: string;
	title: string;
	body: string;
	url: string;
	badge?: string;
}

export async function sendPushNotification(props: I_SendPushNotification): Promise<ApiResponse> {
	const { deviceId, title, body, url, badge } = props;

	try {
		if (!deviceId || !title || !body || !url) {
			throw new Error('Invalid parameters');
		}

		const prefix = `${KV_PREFIX}${deviceId}`;

		const response = await fetch(`${process.env.KV_API_URL}/list?ts=${Date.now()}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				API_KEY: process.env.KV_API_KEY!,
			},
			body: JSON.stringify({ prefix }),
			cache: 'no-store',
		});

		if (!response.ok) {
			throw new Error('Failed to send push notification');
		}

		const data = (await response.json()) as I_KvListResponse;

		if (!data.success) {
			throw new Error('Failed to send push notification');
		}

		const keys = data.keys.keys;

		webpush.setVapidDetails(
			process.env.NEXT_PUBLIC_VAPID_SUBJECT!,
			process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
			process.env.VAPID_PRIVATE_KEY!,
		);

		const payload = JSON.stringify({
			title,
			body,
			url,
			badge,
		});

		await Promise.all(
			keys.map(async key => {
				const response = await fetch(`${process.env.KV_API_URL}/get?ts=${Date.now()}`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						API_KEY: process.env.KV_API_KEY!,
					},
					body: JSON.stringify({ key: key.name }),
					cache: 'no-store',
				});

				if (!response.ok) {
					throw new Error('Failed to send push notification');
				}

				const data = (await response.json()) as { value: string };

				const sub = JSON.parse(data.value) as PushSubscription;

				await webpush.sendNotification(sub, payload);
			}),
		);

		return { success: true };
	} catch (err) {
		console.error(err);
		return { success: false, message: 'Failed to send push notification' };
	}
}
