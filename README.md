# EdgeStone Ticketing System (Frontend)

This is the frontend application for the EdgeStone Ticketing System, built with React, TypeScript, Vite, and TailwindCSS.

## Key Features
- **Ticket Management:** View, track, and resolve support tickets directly from the dashboard.
- **SLA Rule Engine:** Configure dynamic Service Level Agreements (SLAs) for both Vendors and Customers. Allows setting up complex threshold rules (e.g., `< 93%` and `>= 92%` availability) that automatically calculate service credits.
- **Real-Time Downtime Tracking:** Agents can define "Close Date" and "Close Time" which trigger backend recalculations of SLA breaches based on exact system downtimes.
- **AI-Powered Inbox & Replies:** Integrated with advanced AI endpoints to summarize issues and generate intelligent responses.

## Development Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Ensure your `.env` file is properly configured to point to the backend API.

3. **Start Development Server:**
   ```bash
   npm run dev
   ```

4. **Build for Production:**
   ```bash
   npm run build
   ```

## Architecture Notes
- Uses `React Router` for navigation.
- Uses `TailwindCSS` for responsive, utility-first styling.
- Context and states are managed locally within components or lifted up as necessary.
- Form components are integrated with `react-hot-toast` for user notifications.
