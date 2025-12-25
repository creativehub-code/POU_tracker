# PayTrack - Payment Verification Platform

A secure, India-focused payment verification platform with admin-controlled accounts, UPI screenshot validation, and built-in demo experience.

## Features

- **Local Storage Demo** - Runs entirely in browser with no backend configuration needed
- **Admin Dashboard** - Comprehensive client management and payment approval system
- **Client Portal** - Mobile-first interface for payment uploads and tracking
- **OCR Verification** - Automatic Indian Rupee (₹) amount detection from screenshots
- **Demo Mode** - Pre-configured demo accounts with sample data for instant testing

## Demo Accounts

Try the platform with these pre-configured demo accounts:

### Admin Account
- Email: `admin@demo.com`
- Password: `demo123`

### Client Accounts
1. Rajesh Kumar
   - Email: `client1@demo.com`
   - Password: `demo123`
   
2. Priya Sharma
   - Email: `client2@demo.com`
   - Password: `demo123`

## Getting Started

### Prerequisites

- Node.js 18+ installed (or use the v0 preview directly)

### Installation

**Option 1: Use v0 Preview (Recommended)**
- The app is ready to use immediately in the v0 preview
- No installation or configuration required
- Click any demo login button to start

**Option 2: Local Installation**

1. Download the project files

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

**That's it!** No environment variables or database setup needed. The app uses browser local storage for all data.

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS v4
- **Storage**: Browser Local Storage (no backend required)
- **UI Components**: shadcn/ui
- **OCR**: Custom API endpoint with simulated detection

## Key Workflows

### Admin Workflow
1. View dashboard with summary cards (total clients, payments, pending, approved, rejected)
2. Click on summary cards to filter payments by status
3. Add new clients with target and fixed amounts
4. Review payment screenshots with OCR assistance
5. Approve or reject payments with reasons

### Client Workflow
1. View dashboard with approved total, remaining amount, and progress percentage
2. Upload UPI payment screenshots (stored as base64 in local storage)
3. Track payment status (pending, approved, rejected)
4. View rejection reasons for declined payments

## Data Structure

### Users (Local Storage)
- `id` - User ID
- `name` - User name
- `email` - User email
- `role` - "admin" | "client"
- `targetAmount` - Target payment amount
- `fixedAmount` - Fixed payable amount per installment
- `isDemo` - Demo user flag

### Payments (Local Storage)
- `id` - Payment ID
- `clientId` - Reference to user
- `amount` - Payment amount in INR
- `status` - "pending" | "approved" | "rejected"
- `screenshotUrl` - Screenshot as base64 data URL
- `notes` - Admin notes or rejection reason
- `ocrAmount` - OCR detected amount
- `uploadedAt` - Payment upload date
- `reviewedAt` - Payment review date (optional)

## Security Features

- Admin-controlled user creation (no public signup)
- Role-based access control
- Demo data isolation
- Client-side authentication for demo purposes

## Mobile Optimization

- Mobile-first design for client portal
- Touch-friendly buttons and cards
- Responsive layouts for all screen sizes
- Optimized header sizes for mobile viewing
- Smooth image upload experience

## Demo Data

The app comes with pre-populated demo data:
- 3 demo clients with various payment histories
- Sample UPI payment screenshots
- Multiple payment statuses (pending, approved, rejected)
- Progress tracking with target amounts

## Production Notes

For production use, you would want to:
- Replace local storage with a real database (Supabase, Firebase, etc.)
- Implement proper authentication with secure sessions
- Add server-side validation for all operations
- Implement real OCR using Tesseract.js or cloud services
- Add file size limits and image validation
- Implement proper error handling and logging

## Future Enhancements

- Email notifications for payment status changes
- Bulk payment approval
- Payment analytics and reporting
- Export payment history to CSV/PDF
- Multi-currency support
- Advanced OCR with confidence scoring
- Payment reminders and scheduling

## License

MIT License - Feel free to use for personal and commercial projects.
