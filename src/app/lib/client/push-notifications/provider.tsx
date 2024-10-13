'use client';

import React, { createContext, useContext, useState, useEffect, FunctionComponent } from 'react';
import SubscribePrompt from '@/components/SubscribePrompt';

// utils
import { urlBase64ToUint8Array } from '../../format';
import { v4 as uuidv4 } from 'uuid';
import Cookies from 'js-cookie';

// actions
import { subscribeUser, unsubscribeUser, checkSubscription } from './actions';

// types
import type WebPush from 'web-push';

interface PushNotificationsContext {
	isSupported: boolean;
	subscribeToPush: () => void;
	unsubscribeFromPush: () => void;
	isSubscribed: boolean;
	loadingMessage: string | null;
	deviceId: string | null;
}

interface PushNotificationsProviderProps {
	children: React.ReactNode;
}

const PushNotificationsContext = createContext<PushNotificationsContext>({
	isSupported: false,
	subscribeToPush: () => {},
	unsubscribeFromPush: () => {},
	isSubscribed: false,
	loadingMessage: null,
	deviceId: null,
});

export const DEVICE_ID_KEY = 'device_id';
const DONT_ASK_KEY = 'push_dont_ask';
const SUBSCRIBE_PROMPT_DELAY = 2000; // 1 second

export const PushNotificationsProvider: FunctionComponent<PushNotificationsProviderProps> = ({ children }) => {
	const [subscription, setSubscription] = useState<PushSubscription | null>(null);
	const [subscriptionLoaded, setSubscriptionLoaded] = useState<boolean>(false);
	const [isSupported, setIsSupported] = useState<boolean>(false);
	const [showPrompt, setShowPrompt] = useState<boolean>(false);
	const [deviceId, setDeviceId] = useState<string | null>(null);
	const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

	const isSubscribed = !!subscription;

	/**
	 * Check if browser supports service workers and push notifications
	 * and then register the service worker
	 */
	useEffect(() => {
		if ('serviceWorker' in navigator && 'PushManager' in window) {
			setIsSupported(true);
			(async () => {
				const registration = await navigator.serviceWorker.register('/sw.js', {
					scope: '/',
					updateViaCache: 'none',
				});
				const sub = await registration.pushManager.getSubscription();
				setSubscription(sub);
				setSubscriptionLoaded(true);
			})();
		}
	}, []);

	/**
	 * Check if there is a device id in cookies
	 * If not, generate a new one and store it
	 */
	useEffect(() => {
		const storedDeviceId = Cookies.get(DEVICE_ID_KEY);
		if (!storedDeviceId) {
			const newDeviceId = uuidv4();
			Cookies.set(DEVICE_ID_KEY, newDeviceId, { expires: 365 });
			setDeviceId(newDeviceId);
		} else {
			setDeviceId(storedDeviceId);
		}
	}, []);

	/**
	 * Check if current client subscription is still valid
	 * in the database
	 */
	useEffect(() => {
		if (deviceId && subscription) {
			(async () => {
				const res = await checkSubscription({ deviceId });
				if (!res.success) {
					subscription?.unsubscribe();
					setSubscription(null);
				}
			})();
		}
	}, [deviceId, subscription]);

	/**
	 * Determine if the user should be prompted to subscribe
	 */
	useEffect(() => {
		if (!subscription && subscriptionLoaded && deviceId) {
			// Delay the prompt to give time for the user to interact with the page
			setTimeout(async () => {
				// Check if the user has requested not to be asked again
				const dontAsk = Cookies.get(DONT_ASK_KEY);
				if (!dontAsk) {
					setShowPrompt(true);
				}
			}, SUBSCRIBE_PROMPT_DELAY);
		}
	}, [subscription, subscriptionLoaded, deviceId]);

	async function subscribeToPush() {
		if (!deviceId) return;

		const registration = await navigator.serviceWorker.ready;
		const sub = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
		});
		setSubscription(sub);
		setLoadingMessage('Subscribing...');
		await subscribeUser({ sub: sub as unknown as WebPush.PushSubscription, deviceId });
		setLoadingMessage(null);

		Cookies.remove(DONT_ASK_KEY);
	}

	async function unsubscribeFromPush() {
		if (!deviceId) return;

		setLoadingMessage('Unsubscribing...');
		await subscription?.unsubscribe();
		setSubscription(null);
		await unsubscribeUser({ deviceId });
		setLoadingMessage(null);
	}

	async function dontAsk() {
		Cookies.set(DONT_ASK_KEY, 'true', { expires: 365 });
		setShowPrompt(false);
	}

	return (
		<PushNotificationsContext.Provider
			value={{ isSupported, subscribeToPush, unsubscribeFromPush, isSubscribed, loadingMessage, deviceId }}
		>
			{children}
			{showPrompt && isSupported && !subscription ? (
				<SubscribePrompt
					onSubscribe={() => {
						subscribeToPush();
						setShowPrompt(false);
					}}
					onCancel={() => {
						setShowPrompt(false);
					}}
					onDontAsk={dontAsk}
				/>
			) : null}
		</PushNotificationsContext.Provider>
	);
};

export const usePushNotifications = (): PushNotificationsContext => {
	const context = useContext(PushNotificationsContext);
	if (!context) {
		throw new Error('usePushNotifications must be used within PushNotificationsProvider');
	}
	return context;
};
