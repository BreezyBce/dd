import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { SubscriptionProvider } from './SubscriptionContext';


const container = document.getElementById('root');
const root = createRoot(container);
root.render(
	<React.StrictMode>
		<SubscriptionProvider>
		<App />
		</SubscriptionProvider>
	</React.StrictMode>
);