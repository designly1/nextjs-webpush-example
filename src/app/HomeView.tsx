'use client';

import React, { useRef } from 'react';

import { usePushNotifications } from './lib/client/push-notifications/provider';
import { sendPushNotification } from './lib/client/push-notifications/actions';

export default function HomeView() {
	const push = usePushNotifications();

	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const handleSend = async () => {
		if (!textareaRef.current || !push.isSubscribed || !push.deviceId) {
			return;
		}

		const message = textareaRef.current.value;
		if (!message) {
			return;
		}

		console.log('Sending message:', message);

		await sendPushNotification({
			deviceId: push.deviceId,
			title: 'New Message',
			body: message,
			url: 'https://example.com',
		});
	};

	return (
		<div className="w-full max-w-xl m-auto rounded-xl border-[1px] shadow-lg p-6">
			<h1 className="text-2xl font-bold text-center">Push Notifications</h1>
			<p className="text-gray-600 text-center mt-2">
				You are currently{' '}
				{push.isSubscribed ? (
					<span className="text-green-600">subscribed</span>
				) : (
					<span className="text-red-600">not subscribed</span>
				)}{' '}
				to push notifications
			</p>
			<div className="flex justify-center mt-4">
				<button
					className={`text-white px-4 py-2 rounded ${push.isSubscribed ? 'bg-red-500' : 'bg-blue-500'}`}
					onClick={push.isSubscribed ? push.unsubscribeFromPush : push.subscribeToPush}
				>
					{push.isSubscribed ? 'Unsubscribe' : 'Subscribe'}
				</button>
			</div>
			{push.isSubscribed ? (
				<>
					<textarea
						className="textarea textarea-bordered w-full mt-6"
						ref={textareaRef}
						placeholder="Enter message to send"
					/>
					<button className="text-white px-4 py-2 rounded bg-indigo-500 mt-4" onClick={handleSend}>
						Send Message
					</button>
				</>
			) : null}
		</div>
	);
}
