import React from 'react';

interface Props {
	onSubscribe: () => void;
	onCancel: () => void;
	onDontAsk: () => void;
}

export default function SubscribePrompt(props: Props) {
	const { onSubscribe, onCancel, onDontAsk } = props;

	return (
		<div className="fixed inset-0 z-[9997] flex items-end justify-center pb-2 pointer-events-none">
			<div className="bg-white p-8 rounded-lg shadow-lg border-[1px] border-gray-200 flex flex-col pointer-events-auto">
				<h1 className="text-xl font-bold">Subscribe to Push Notifications?</h1>
				<p className="text-gray-600 mt-1">
					Get notified regarding account activity, new features, and more.
				</p>
				<div className="flex gap-4 mt-4 mx-auto">
					<button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={onSubscribe}>
						Subscribe
					</button>
					<button className="bg-red-500 text-white px-4 py-2 rounded" onClick={onCancel}>
						Cancel
					</button>
					<button className="bg-gray-500 text-white px-4 py-2 rounded" onClick={onDontAsk}>
						Don&apos;t ask again
					</button>
				</div>
			</div>
		</div>
	);
}
