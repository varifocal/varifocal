import { useEffect } from 'react';
import {
	useRealtimeKitClient,
	useRealtimeKitMeeting,
	RealtimeKitProvider,
} from '@cloudflare/realtimekit-react';
import { RtkMeeting } from '@cloudflare/realtimekit-react-ui';

function MeetingUI() {
	const { meeting } = useRealtimeKitMeeting();
	return <RtkMeeting mode="fill" meeting={meeting} showSetupScreen={true} />;
}

export default function RealtimeMeeting({ authToken }: { authToken: string }) {
	const [meeting, initMeeting] = useRealtimeKitClient();

	useEffect(() => {
		if (authToken) {
			initMeeting({ authToken });
		}
	}, [authToken]);

	return (
		<RealtimeKitProvider value={meeting}>
			<MeetingUI />
		</RealtimeKitProvider>
	);
}
